odoo.define('tit_pos_order.TicketScreenEnAttente', function (require) {
    'use strict';
const PosComponent = require('point_of_sale.PosComponent'); 
    
    const Registries = require('point_of_sale.Registries');
    const IndependentToOrderScreen = require('point_of_sale.IndependentToOrderScreen');
    const { useListener } = require('web.custom_hooks');
    const { posbus } = require('point_of_sale.utils');
    var models = require('point_of_sale.models');
    //load waiting orders
    models.load_models({
        model: 'pos.commande',
        fields: [],
        domain: function(self){return [['state','in',['draft','en_attente']],['config_id','=',self.config.id]]; },
        loaded: function(self,commandes){
            self.commandes = commandes;
        },
    });

    models.load_models({
        model: 'pos.commande.line',
        fields: [],
        domain: function(self){ return [['order_id.state','in',['draft', 'en_attente']]]; },
        loaded: function(self,commandes_lines){
            self.commandes_lines = commandes_lines;
        },
    });

    models.load_models({
        model: 'pos.payment_cmd',
        fields: [],
        domain: function(self){ return [['pos_commande_id.state','in',['draft', 'en_attente']]]; },
        loaded: function(self,payment_cmd_lines){
            self.payment_cmd_lines = payment_cmd_lines;
        },
    });      
    class TicketScreenEnAttente extends PosComponent {
        constructor() {
            super(...arguments);
            console.log("tickets en attente...")   
            this.commandes_recupere = this.env.pos.commandes
            this.commandes_lines_recupere = this.env.pos.commandes_lines
            //console.log(this.commandes_recupere)
            //console.log(this.commandes_lines_recupere)
        }
        back() { 

            //console.log("back")
            this.trigger('close-temp-screen'); 
        } 
        getDate(commande) {
            return moment(commande.date).format('DD/MM/YYYY hh:mm A');
        }
        selectOrder(com, id){
            //console.log("select order")
            let or = this.env.pos.get_order()
            //console.log(id)
            //console.log(or)
            //console.log(com)
            this.load_commande(com, id);
        }

        load_commande (commande_id, id) {
            var order = this.env.pos.add_new_order();
            //récupérer la commande selectinnée
            var commande = this.get_commande_by_id(id)
            //modifier client de la commande crée
            order.set_client(this.env.pos.db.get_partner_by_id(commande.partner_id[0]));
            // récupérer les order line de la commande selectionnée
            var commande_line = this.get_commande_lines(commande.id)
            //console.log(commande_line)
            for (var i=0; i<commande_line.length;i++) {
                var product = this.env.pos.db.get_product_by_id(commande_line[i].product_id[0])
                var qty = parseFloat(commande_line[i].qty)
                var discount = parseInt(commande_line[i].discount)
                var price = parseFloat(commande_line[i].price_unit)
                order.add_product(product,{quantity : qty, price : price, discount : discount})
            }
            // récupérer les lignes de paiement de la commande selectionnée
            var cmd_paymnt_line = this.get_cmd_payment_lines(commande.id)
            // payment line
            if (commande.journal_id) {
                for (var i=0; i<cmd_paymnt_line.length;i++) {
                    var cashregister = this.get_cashregister_from_journal_id(cmd_paymnt_line[i].payment_method_id[0]);
                    var paymentline = order.add_paymentline(cashregister)
                    console.log(cmd_paymnt_line[i])
                    order.selected_paymentline.set_amount(cmd_paymnt_line[i].montant)
                }

                /*var cashregister = this.get_cashregister_from_journal_id(commande.journal_id[0]);
                var amount = commande.acompte
                var paymentline = order.add_paymentline(cashregister)
                console.log(paymentline)
                order.selected_paymentline.set_amount(amount)*/
                
            }
        }
        get_commande_by_id (id) {
            /*
            @param : id = identifiant de la commande sélectionnée
            cette fonction permet de retourner la commande  en attente qui a id en paramètre
            */
            var commandes = this.env.pos.commandes;
            //console.log(this.env.pos.commandes)
            for (var i=0; i < commandes.length; i++) {
                if (commandes[i].id === id) {
                    return commandes[i];
                }
            }
        }
        get_cmd_payment_lines(cmd_id){
            console.log("dfghbnj,")
            var lines = [];
            var cmd_pay_lignes = this.env.pos.payment_cmd_lines;
            for (var i=0; i < cmd_pay_lignes.length; i++) {
                if (cmd_pay_lignes[i].pos_commande_id[0] === cmd_id) {
                    lines.push(cmd_pay_lignes[i]);
                }
            }
            console.log(lines)
            return lines
        }
        get_commande_lines(commande_id) {
            /*
            @param : commande_id = identifiant de la commande selectinnée
            cette fonction permet de retourner les lignes de commandes en attente associées
            à la commande qui a id = commande_id
            */
            var lines = [];
            var commandes_lines = this.env.pos.commandes_lines;
            for (var i=0; i < commandes_lines.length; i++) {
                if (commandes_lines[i].order_id[0] === commande_id) {
                    lines.push(commandes_lines[i]);
                }
            }
            return lines
        }

        get_cashregister_from_journal_id(journal_id) {
            /*
            @param : journal_id = journal trouvé dans la commande sélectionnée
            cette fonction permet de retourner la méthode de payement de la commande
            en attente selectionnée
            */
            for (var i in this.env.pos.payment_methods) {
                if (this.env.pos.payment_methods[i].id === journal_id) {
                    console.log("yes")
                    return this.env.pos.payment_methods[i]
                }
            }
        }

    }
    TicketScreenEnAttente.template = 'TicketScreenEnAttente';

    Registries.Component.add(TicketScreenEnAttente);

    return TicketScreenEnAttente;
});


