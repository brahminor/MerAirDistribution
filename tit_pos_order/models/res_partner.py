# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.addons.base.models.res_partner import WARNING_MESSAGE, WARNING_HELP

class res_partner(models.Model):
    _inherit = "res.partner"
    
    siren_company = fields.Char("Siren")
    nic_company = fields.Char("NIC")

    @api.model
    def utilsateur_atteind_limite(self, partner):
        """
        cette fonction permette de chercher la limite de crédit du client
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