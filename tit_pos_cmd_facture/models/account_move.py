# -*- coding: utf-8 -*-

from odoo import models, fields, api, _

class account_move(models.Model):
    _inherit = "account.move"

    avoir_client = fields.Float("Avoir client", related='partner_id.avoir_client')

    @api.model
    def update_partner(self, donnes):
        """cette fonction est appelé depuis front-end afin de modifier le client 
        de la facture
        @param:
        - donnes : est un dictionnaire contenant l'id de la facture et l'id du client modifié 
        dedans
        """
        if 'client_modifie' in donnes and'facture_modifier_id' in donnes:
            if donnes['client_modifie'] != 0:
                facture_modifier = self.env['account.move'].browse(donnes['facture_modifier_id'])
                if facture_modifier:
                    for i in facture_modifier:
                        i.partner_id = donnes['client_modifie']
                return 1
            return 0
        return 0

    @api.model
    def add_invoice_payment(self, amount, invoice_id, journal_id, session_id):
        """
        cette fonction est appelé depuis pos et elle permet d'enregistrer
        le paiement d'une facture directement depuis le pos.
        @param:
            -amount : montant à payer
            -invoice_id : la facture à payer
            -journal_id : le journal choisi pour effectuer le paiement
            -session_id : session courante ouvert dans le pos
        """
        amount = float(amount)
        invoice_id = int(invoice_id)
        journal_id = int(journal_id)
        session_id = int(session_id)
        if amount > 0:
            #create bank statement
            journal = self.env['account.journal'].browse(journal_id)
            facture_selected = self.env['account.move'].browse(invoice_id)
            
            if journal.type == 'avoir_type' and journal.avoir_journal == True and facture_selected:
                #si le journal choisi est un avoir, débiter le montant depuis avoir du client
                client_associe = self.env['res.partner'].browse(facture_selected.partner_id.id)
                if client_associe:
                    if amount > client_associe.avoir_client:
                        return client_associe.avoir_client
                    else:
                        client_associe.avoir_client = client_associe.avoir_client - amount

            # use the company of the journal and not of the current user
            company_cxt = dict(self.env.context, force_company=journal.company_id.id)
            
            payment_record = { 
                'communication': "Paiement en caisse",
                'journal_id': journal_id,
                'amount': amount,
            }
            pay=self.env['account.payment.register'].with_context({'active_id': invoice_id,'active_ids': invoice_id,'active_model': 'account.move'}).create(payment_record)
            pay.action_create_payments()
            return 1
        return 0

    