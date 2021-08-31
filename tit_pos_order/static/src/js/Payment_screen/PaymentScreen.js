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
            console.log("constructor")
            this.verif_groupe();
            console.log(this.env.pos)
        }
        async verif_groupe(){
            /* cette fonction permet de vérifier le groupe associé à l'utilisateur 
            connecté à la session afin de lui mettre le bouton de choix du client 
            invisible si l'utilisateur connecté apprtient au groupe de caissier.
            */
            let user = {}
                const order = this.env.pos.get_order();
                console.log(order)
                console.log("verif")
                user['id_user'] = this.env.pos.user.id
                
                let result = await this.rpc({
                                    model: 'res.users',
                                    method: 'verification_groupe',
                                    args: [user],
                                });
                if(result == 2){
                    // mettre le bouton "valider la commande" invisible si le groupe trouvé est caissier
                    console.log("dsfghjmmml")
                    var contents = $('.screen-content');
                    contents.find(".customer-button").hide();   
                } 
           }
        async IsCustomButton() {
           /*
           Fonction pour créer la commande en attente
           */
            const order = this.env.pos.get_order();
            //console.log(order)
            //console.log(this.env.pos)
            //console.log(order.selected_paymentline.payment_method.id)

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
                        console.log(commande_id)  
                        console.log("création des lignes de commandes associé à la cmd en attente crée")
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
                            console.log("+1")
                            console.log(order.paymentlines.models[k])
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
                            }
                        }

                        //modifier l'état de la commande courante
                        


                    });
                    
                    Gui.showPopup("ValidationCommandeSucces", {
                       title : this.env._t("La commande est validée avec succès"),
                           confirmText: this.env._t("OK"),
                    });
                    /*créer une nouvelle commande (pour etre redirigé vers une nouvelle
                    interface de commande et le tous soit à 0)
                    */
                    this.env.pos.add_new_order();
                }   
                
                
                            
                }   
        }


        
        
    };
    Registries.Component.extend(PaymentScreen, CustomButtonPaymentScreen);
    return CustomButtonPaymentScreen;
});