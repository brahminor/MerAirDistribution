odoo.define('tit_pos_order.PaymentScreenButton', function(require) {
'use strict';
    const { Gui } = require('point_of_sale.Gui');
    const PosComponent = require('point_of_sale.PosComponent');
    const { posbus } = require('point_of_sale.utils');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const { useListener } = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const PaymentScreen = require('point_of_sale.PaymentScreen');
    var rpc = require('web.rpc');

    const CustomButtonPaymentScreen = (PaymentScreen) =>
    class extends PaymentScreen {
        constructor() {
            super(...arguments);
            var self = this;
            this.verif_groupe();
        }
        async verif_groupe(){
            /* cette fonction permet de vérifier le groupe associé à l'utilisateur 
            connecté à la session afin de lui mettre le bouton de choix du client 
            invisible si l'utilisateur connecté apprtient au groupe de caissier.
            */
            let user = {}
                const order = this.env.pos.get_order();
                user['id_user'] = this.env.pos.user.id
                
                let result = await this.rpc({
                                    model: 'res.users',
                                    method: 'verification_groupe',
                                    args: [user],
                                });
                if(result == 2){
                    /* 
                    mettre le bouton de modification du client et la case à cocher "débloquer client"
                    invisible si le groupe trouvé est caissier
                    */
                    var contents = $('.screen-content');
                    contents.find(".customer-button").hide();   
                    contents.find(".debloquer_client").hide();   

                } 
                if(result == 3){
                    // mettre le bouton de modification du client invisible si le groupe trouvé est comptable
                    var contents = $('.screen-content');
                    contents.find(".customer-button").hide();   
                } }

        async validateOrder(isForceValidate) {
            var l2 =this;
            if(this.env.pos.config.cash_rounding) {
                if(!this.env.pos.get_order().check_paymentlines_rounding()) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Rounding error in payment lines'),
                        body: this.env._t("The amount of your payment lines must be rounded to validate the transaction."),
                    });
                    return;
                }
            }
            if (await this._isOrderValid(isForceValidate)) {
                
                if(!this.env.pos.get_order().is_to_invoice()){
                  this.showPopup('ErrorPopup', {
                        title:('Le choix de la fature est requis'),
                        body:('Veuillez sélectionner la facture s.v.p ! ')
                    });
                }
                else{

                    try {
                    let fields = {}
                    fields['id'] = this.env.pos.get_order().attributes.client.id
                    // vérifier si le client a atteind déjà la limite de crédit ou pas
                    let limite_atteind = await this.rpc({
                        model: 'res.partner',
                        method: 'utilsateur_atteind_limite_pay',
                        args: [fields],
                    });
                    
                    if(limite_atteind > 0){
                        var valll = $('input[name=debloc_client]:checked').val();
                        if (valll === 'yes'){
                            // c'est à dire le comptable a débloqué ce client
                            var order = this.env.pos.get_order()
                            var commande_ancienne = order.commande_id
                            // remove pending payments before finalizing the validation
                            for (let line of this.paymentLines) {
                                if (!line.is_done()){
                                    this.currentOrder.remove_paymentline(line);
                                }
                            }
                            await this._finalizeValidation();
                            rpc.query({
                                            model: 'pos.commande',
                                            method: 'update_state_done',
                                            args: [commande_ancienne]
                                            }).then(function(u){
                                                l2.reload_cmd_en_attente(); 
                            })
                        }
                        else {
                            // le cas ou la limite de crédit est atteind
                            this.showPopup('ErrorPopup', {
                                title:('Limite de crédit'),
                                body:('La limite de crédit est dépassée pour ce client !')
                            });
                        } } 
                    else{
                        var order = this.env.pos.get_order()
                        var commande_ancienne = order.commande_id
                        
                        // remove pending payments before finalizing the validation
                        for (let line of this.paymentLines) {
                            if (!line.is_done()){
                                this.currentOrder.remove_paymentline(line);
                            }
                        }
                        await this._finalizeValidation();
                        rpc.query({
                                        model: 'pos.commande',
                                        method: 'update_state_done',
                                        args: [commande_ancienne]
                        })
                    } 
                } catch (error) {
                    if (error.message.code < 0) {
                        await this.showPopup('OfflineErrorPopup', {
                            title: this.env._t('Offline'),
                            body: this.env._t('Unable to save changes.'),
                        });
                    } else {
                        throw error;
                    }
                } } }     
        }
        async IsCustomButton() {
           /*
           Fonction pour créer la commande en attente
           */
           var l =this;
            const order = this.env.pos.get_order();
            var commande_ancienne = order.commande_id
            if (order.attributes.client == null){
                return this.showPopup('ErrorPopup', {
                    title:('Le choix du client est requis'),
                    body:('Veuillez définir le client s.v.p ! ')
                });
            }
            else{

                    if (order.selected_paymentline === undefined){
                        return this.showPopup('ErrorPopup', {
                            title:('Le choix de la méthode de paiement est requis'),
                            body:('Veuillez définir la méthode de paiement s.v.p ! ')
                        });
                    }
                    else
                    {
                    //traitement associé à la confirmation de l'alerte de dépassement de la limite
                    let fields = {}
                    fields['id'] = order.attributes.client.id
                    fields['partner_id'] = order.attributes.client.id
                    fields['session_id'] = order.pos_session_id
                    fields['journal_id'] = order.selected_paymentline.payment_method.id
                    var montant_acompte = 0.0
                    if (order.paymentlines.length){
                        for(let k=0; k<order.paymentlines.length; k++){
                            montant_acompte += order.paymentlines.models[k].amount
                        }
                    }
                    fields['acompte'] = montant_acompte
                    //création de la commande en attente
                    let commandeId = await this.rpc({
                        model: 'pos.commande',
                        method: 'create_commande',
                        args: [fields],
                    }).then(function (commande_id) {
                        //création des lignes de commandes associé à la cmd en attente crée
                        for (let i=0; i<order.orderlines.models.length ; i++){
                        let commandeLineId = rpc.query({
                            model: 'pos.commande.line',
                            method: 'create_commande_line',
                            args: [{
                                'order_id' : commande_id,
                                'qty' : order.orderlines.models[i].quantity,
                                'product_id' : order.orderlines.models[i].product.id,
                                'price_unit' : order.orderlines.models[i].price,
                                'discount' : order.orderlines.models[i].discount,
                                'tax_ids' : order.orderlines.models[i].product.taxes_id,
                            }]
                            });
                        }  
                        //remplissage des paiements associés à la cmd en attente
                        if (order.paymentlines.length){
                            
                        for(let k=0; k<order.paymentlines.length; k++){
                            //////////////
                             if (order.paymentlines.models[k].check_date  && order.paymentlines.models[k].check_number){
                                let paymentLineId = rpc.query({
                                model: 'pos.payment_cmd',
                                method: 'create_payment_cmd',
                                args: [{
                                    'pos_commande_id' : commande_id,
                                    'montant' : order.paymentlines.models[k].amount,
                                    'check_number' : order.paymentlines.models[k].check_number,
                                    'check_date' : order.paymentlines.models[k].check_date,
                                    'session_id' : order.pos_session_id,
                                    'payment_method_id' : order.paymentlines.models[k].payment_method.id
                                    }]
                                    });
                            }
                            else if(order.paymentlines.models[k].check_number){
                                let paymentLineId = rpc.query({
                                model: 'pos.payment_cmd',
                                method: 'create_payment_cmd',
                                args: [{
                                    'pos_commande_id' : commande_id,
                                    'check_number' : order.paymentlines.models[k].check_number,
                                    'montant' : order.paymentlines.models[k].amount,
                                    'session_id' : order.pos_session_id,
                                    'payment_method_id' : order.paymentlines.models[k].payment_method.id
                                    }]
                                    });
                            }
                            else if(order.paymentlines.models[k].check_date){
                                let paymentLineId = rpc.query({
                                model: 'pos.payment_cmd',
                                method: 'create_payment_cmd',
                                args: [{
                                    'pos_commande_id' : commande_id,
                                    'check_date' : order.paymentlines.models[k].check_date,
                                    'montant' : order.paymentlines.models[k].amount,
                                    'session_id' : order.pos_session_id,
                                    'payment_method_id' : order.paymentlines.models[k].payment_method.id
                                    }]
                                    });
                            }
                            else{
                                let paymentLineId = rpc.query({
                                model: 'pos.payment_cmd',
                                method: 'create_payment_cmd',
                                args: [{
                                    'pos_commande_id' : commande_id,
                                    'montant' : order.paymentlines.models[k].amount,
                                    'session_id' : order.pos_session_id,
                                    'payment_method_id' : order.paymentlines.models[k].payment_method.id
                                    }]
                                    });
                            }  } }
                        //modifier l'état de la commande courante
                        rpc.query({
                                model: 'pos.commande',
                                method: 'update_state_archived',
                                args: [{
                                    'commande_ancienne': commande_ancienne, 
                                    'commande_nouvelle': commande_id
                                }]
                                }).then(function(u){
                                l.reload_cmd_en_attente();

                               })
                    });
                    
                    Gui.showPopup("ValidationCommandeSucces", {
                       title : this.env._t("La commande est validée avec succès"),
                           confirmText: this.env._t("OK"),
                    });
                    /*créer une nouvelle commande (pour etre redirigé vers une nouvelle
                    interface de commande et le tous soit à 0)
                    */ 
                    this.env.pos.delete_current_order();
                    this.env.pos.add_new_order();
                    this.env.pos.delete_current_order();
                }  }   } 

                reload_cmd_en_attente(){
                        /// tester  actualisation de la page de cmd en attente////
                        var self = this; 
                        rpc.query({
                            model: 'pos.commande',
                            method: 'search_read',
                            args: [[['state','=','en_attente']], []],
                        })
                        .then(function (orders){
                            self.env.pos.commandes = orders;
                            rpc.query({
                            model: 'pos.payment_cmd',
                            method: 'search_read',
                            args: [[['pos_commande_id.state', '=', 'en_attente']], []],
                        })
                        .then(function (payment_cmd_lines_result){
                            self.env.pos.payment_cmd_lines = payment_cmd_lines_result;
                        rpc.query({
                            model: 'pos.commande.line',
                            method: 'search_read'
                            })
                        .then(function (orders_lines){
                            self.env.pos.commandes_lines = orders_lines;
                        }); }); });
                        /// tester  actualisation de la page de cmd en attente////
        }      
    };
    Registries.Component.extend(PaymentScreen, CustomButtonPaymentScreen);
    return CustomButtonPaymentScreen;
});