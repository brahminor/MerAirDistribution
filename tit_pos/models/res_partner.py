# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.addons.base.models.res_partner import WARNING_MESSAGE, WARNING_HELP

class res_partner(models.Model):
    _inherit = "res.partner"
    
    siren_company = fields.Char("Siren")
    nic_company = fields.Char("NIC")
    property_account_position_id = fields.Many2one(default=lambda self: self._get_property_account_position_id())

    @api.model
    def _get_property_account_position_id(self):
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
            if key  in [ 'contact_name', 'contact_phone', 'contact_email']:
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
        #Contact
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