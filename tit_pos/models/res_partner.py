# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from datetime import date

class res_partner(models.Model):
    _inherit = "res.partner"
    
    @api.model
    def _get_property_account_position_id(self):
        """
        cette fonction permet de retourner la position fiscale qu'elle a 
        client français cochée
        """
        position_fiscale=self.env['account.fiscal.position'].search([('client_francais','=',True)])
        if position_fiscale:
            return position_fiscale[0].id
        return 0

    @api.model
    def create_from_ui(self, partner):
        """ create or modify a partner from the point of sale ui.
            partner contains the partner's fields. """
        # image is a dataurl, get the data after the comma
        partners = {}
        contact = {}
        for key, value in partner.items():
            if key in ['contact_name', 'contact_phone', 'contact_email']:
                contact[key] = value
            elif key != 'contact_id':
                partners[key] = value
        if partners.get('image'):
            partners['image'] = partners['image'].split(',')[1]
        partner_id = partners.pop('id', False)
        if partner_id:  # Modifying existing partner
            self.browse(partner_id).write(partners)
        else:
            partners['lang'] = self.env.user.lang
            partner_id = self.create(partners).id
        # Contact
        if partner.get('company_type', '') == 'company':
            contact_coordonnee = dict()
            if 'contact_name' in contact:
                contact_coordonnee['name'] = contact['contact_name']
            if 'contact_phone' in contact:
                contact_coordonnee['phone'] = contact['contact_phone']
            if 'contact_email' in contact:
                contact_coordonnee['email'] = contact['contact_email']
            contact_coordonnee['parent_id'] = partner_id
            contact_coordonnee['type'] = 'contact'
            contact_coordonnee['company_type'] = 'person'
            contact_id = partner.pop('contact_id', False)
            if contact_id:
                self.browse(contact_id).write(contact_coordonnee)
            else:
                contact_id = self.create(contact_coordonnee).id
        return partner_id

    @api.model
    def utilsateur_atteind_limite(self, partner):
        """
        cette fonction utilisée par la page de création d'une commande sur front,
        elle permette de chercher la limite de crédit du client
        et chercher s'il a atteind la limite de crédit ou pas encore.
        """
        partner_id = self.env['res.partner'].search([('id','=',partner['id'])])
        limite_credit = 0.0
        if partner_id:
            limite_credit = partner_id[0].credit_limit
        somme_montants_du = 0.0
        factures_ids = self.env['account.move'].search([('partner_id','=',partner['id'])])
        for i in factures_ids:
            somme_montants_du += i.amount_residual
        
        if (limite_credit != 0 and limite_credit < somme_montants_du ):
            #c'est a dire le client a atteind la limite de crédit
            return 1
        else:
            #c'est à dire le client n'atteind plus la limite
            return 0

    @api.model
    def utilsateur_atteind_limite_pay(self, partner):
        """
        cette fonction utilisée par la page de paiement d'une commande sur front,
        cette fonction permette de chercher la limite de crédit du client
        et chercher s'il a atteind la limite de crédit selon les conditions de 
        regelement ou pas encore
        """
        partner_id = self.env['res.partner'].search([('id','=',partner['id'])])
        limite_credit = 0.0
        if partner_id:
            limite_credit = partner_id[0].credit_limit
        somme_montants_du = 0.0
        today = str(date.today())
        factures_ids = self.env['account.move'].search([('partner_id','=',partner['id']),('invoice_date_due','<=',today)])
        for i in factures_ids:
            somme_montants_du += i.amount_residual
        if (limite_credit != 0 and limite_credit < somme_montants_du ):
            #c'est a dire le client a atteind la limite de crédit
            return 1
        else:
            #c'est à dire le client n'atteind plus la limite
            return 0
