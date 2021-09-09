# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, models, modules, _

class resUsers(models.Model):
    _inherit = 'res.users'
    
    @api.model
    def verification_groupe(self, user):
        #cette fonction permet de vérifier le groupe associé à l'utilisateur en paramètre
        user_actif = self.env['res.users'].search([('id','=',user['id_user'])])
        if user_actif and user_actif.has_group('tit_pos_order.group_vendeur') and user_actif.has_group('tit_pos_order.group_caissier'):
            return 0
        elif user_actif and user_actif.has_group('tit_pos_order.group_vendeur'):
            return 1
        elif user_actif and user_actif.has_group('tit_pos_order.group_caissier'):
            return 2
        elif user_actif and user_actif.has_group('tit_pos_order.group_comptable'):
            return 3
        return 0