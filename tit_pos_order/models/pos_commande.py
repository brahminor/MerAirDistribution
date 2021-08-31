# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from dateutil.relativedelta import relativedelta
from datetime import datetime, timedelta

class pos_commande(models.Model):
    _name = "pos.commande"
    
    name = fields.Char(track_visibility = 'always')
    journal_id = fields.Many2one('account.journal',string="Journal")
    partner_id = fields.Many2one('res.partner', string = "Client")
    session_id = fields.Many2one('pos.session', string = "Session")
    config_id = fields.Many2one('pos.config', related = "session_id.config_id", string = "Point de vente", store = True)
    date = fields.Datetime('Date', help = "Date de la commande", default = fields.Datetime.now())
    state = fields.Selection([('draft','Brouillon') ,('en_attente','En attente'), ('recetionne','Réceptionné'), ('done','Terminé')], string = "Statut")
    currency_id = fields.Many2one('res.currency', string = "Devise" )
    order_line = fields.One2many('pos.commande.line', 'order_id')
    company_id = fields.Many2one('res.company', related = "session_id.config_id.company_id")
    amount_total = fields.Monetary('Total TTC', compute = "get_amount_total", store = True)
    currency_id = fields.Many2one('res.currency', string = "Devise", default = lambda self: self.env.user.company_id.currency_id)
    acompte = fields.Monetary('Acompte')
    payment_ids = fields.One2many('pos.payment_cmd', 'pos_commande_id', string='Paiements')

    @api.depends('order_line.price_subtotal')
    def get_amount_total(self):
        #cette fonction permet de calculer le total TTC
        for order in self:
            amount_total = 0
            for line in order.order_line:
                amount_total += line.price_subtotal
            order.update({
                'amount_total': amount_total,
            })

    @api.model
    def create_commande(self, commande):
        #cette fonction permet de créer la commande en attente depuis point of sale ui
        commande_coordonnee = dict()
        if 'journal_id' in  commande:
            commande_coordonnee['journal_id'] = commande['journal_id']
        if 'partner_id' in  commande:
            commande_coordonnee['partner_id'] = commande['partner_id']
        commande_coordonnee['state'] = "en_attente"
        if 'session_id' in commande:
            commande_coordonnee['session_id'] = commande['session_id']
        if 'acompte' in commande:
            commande_coordonnee['acompte'] = commande['acompte']
        commande_id = self.create(commande_coordonnee).id
        return commande_id
    

class pos_commande_line(models.Model):
    _name = "pos.commande.line"
    
    product_id = fields.Many2one('product.product', string = "Article")
    qty = fields.Float('Quantité')
    price_unit = fields.Monetary('Prix unitaire')
    discount = fields.Float('Remise(%)')
    tax_ids = fields.Many2many('account.tax', string = "Taxes")
    order_id = fields.Many2one('pos.commande')    
    company_id = fields.Many2one('res.company', related = "order_id.company_id")
    price_ttc = fields.Monetary('Prix TTC', compute = "get_price_ttc", store = True)
    currency_id = fields.Many2one('res.currency', string = "Devise", default = lambda self: self.env.user.company_id.currency_id)
    price_subtotal = fields.Monetary('Sous-total', compute = "get_amount_subtotal", store = True)
    total_hors_taxe = fields.Monetary('Sous-total hors taxes', compute = "get_amount_subtotal_ht", store = True)
    company_id = fields.Many2one('res.company', related = "order_id.company_id")
    
    @api.depends('price_unit','tax_ids')
    def get_price_ttc(self):
        #cette fonction permet de calculer le prix TTC
        for res in self:
            tax_amount = 0
            for tax in res.tax_ids:
                tax_amount += (res.price_unit * tax.amount/100)
            res.price_ttc = res.price_unit + tax_amount

    @api.depends('price_unit', 'qty', 'discount', 'tax_ids')
    def get_amount_subtotal(self):
        #cette fonction permet de calculer le sous total
        for line in self:
            price = line.price_unit * (1 - (line.discount or 0.0) / 100.0)
            taxes = line.tax_ids.compute_all(price, line.currency_id, line.qty, product = line.product_id, partner = line.order_id.partner_id)
            line.update({
                'price_subtotal': taxes['total_included'],
            })
    
    @api.depends('price_unit', 'qty')
    def get_amount_subtotal_ht(self):
        #cette fonction permet de calculer le sous total hors taxes
        for line in self:
            price = line.price_unit * line.qty
            line.update({
                'total_hors_taxe': price,
            })
    
    @api.model
    def create_commande_line(self, commande_line):
        #cette fonction permet de créer la ligne de commande en attente
        commande_id = self.create(commande_line).id
        return commande_id