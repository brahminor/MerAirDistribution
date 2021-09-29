odoo.define('tit_pos_cmd_facture.FacturesNonPayee', function (require) {
    'use strict';
    const PosComponent = require('point_of_sale.PosComponent'); 
    
    const Registries = require('point_of_sale.Registries');
    const IndependentToOrderScreen = require('point_of_sale.IndependentToOrderScreen');
    const { useListener } = require('web.custom_hooks');
    const { posbus } = require('point_of_sale.utils');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');

    //load waiting orders
    models.load_models({
        model: 'account.move',
        fields: [],
        domain: function(self){return [['payment_state','in',['not_paid','partial']],['move_type','=','out_invoice'],['state','!=','cancel'],['invoice_date_due', '<=',new Date()]]; },
        loaded: function(self,factures_non_payees){
            self.factures_non_payees = factures_non_payees;
        },
    });
    
    class FacturesNonPayee extends PosComponent {
        constructor() {
            super(...arguments);
            var self = this; 
            this.factures_non_payees = this.env.pos.factures_non_payees

            useListener('filter-selected', this._onFilterSelected);
            useListener('search', this._onSearch);
            this.searchDetails = {};
            this.filter = null;
            this._initializeSearchFieldConstants();
        } 

        back() { 
            this.trigger('close-temp-screen'); 
        } 
        getDate(factures_non_payees) {
            return moment(factures_non_payees.invoice_date).format('DD/MM/YYYY hh:mm A');
        }
        getDateEcheance(factures_non_payees){
            return moment(factures_non_payees.invoice_date_due).format('DD/MM/YYYY hh:mm A');
        }
        get_payment_state(factures_non_payees){
            var etat_du_paiement = factures_non_payees.payment_state
            
            if (etat_du_paiement == 'not_paid')
                return 'Non payées'
            else if (etat_du_paiement == 'in_payment') 
                return 'En paiement'
            else if (etat_du_paiement == 'partial')
                return 'Partiellement réglé'
            else return 'Payée'            
        }

        get_payment_statut(factures_non_payees){
            var state = factures_non_payees.state
            
            if (state == 'draft')
                return 'Brouillon'
            else if (state == 'posted') 
                return 'Comptabilisé'
            else if (state == 'cancel')
                return 'Annulé'
            else return 'Brouillon'            
        }


        async selectFacture_for_details(facture){
            
            this.showScreen('FactureDetails', { facture_selected: facture });
        }
 
        /*
            Partie pour le filtre des factures par rapport au client
        */
        get factures_non_payeesFiltre() {
            
            const filterCheck = (factures_non_payees) => {
                if (this.filter) {
                    const screen = factures_non_payees.get_screen_data();
                    return this.filter === this.constants.screenToStatusMap[screen.name];
                }
                return true;
            };
            const { fieldValue, searchTerm } = this.searchDetails;
            const fieldAccessor = this._searchFields[fieldValue];
            const searchCheck = (factures_non_payees) => {
                if (!fieldAccessor) return true;
                const fieldValue = fieldAccessor(factures_non_payees);
                if (fieldValue === null) return true;
                if (!searchTerm) return true;
                return fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm.toLowerCase());
            };
            const predicate = (factures_non_payees) => {
                return filterCheck(factures_non_payees) && searchCheck(factures_non_payees);
            };
            return this.env.pos.factures_non_payees.filter(predicate);
        }
        
        get searchBarConfig() {
            // cette fonction est associée à  la barre de recherche
            return {
                searchFields: this.constants.searchFieldNames,
                filter: { show: false, options: {} },
            };
        }
        get _searchFields() {
            const { Customer } = this.getSearchFieldNames();
            var fields = {
                [Customer]: (factures_non_payees) => factures_non_payees.partner_id[1],
            };
            return fields;
        }
        _initializeSearchFieldConstants() {
            this.constants = {};
            Object.assign(this.constants, {
                searchFieldNames: Object.keys(this._searchFields)
            });
        }
        _onFilterSelected(event) {
            this.filter = event.detail.filter;
            this.render();
        }
        _onSearch(event) {
            const searchDetails = event.detail;
            Object.assign(this.searchDetails, searchDetails);
            this.render();
        }
        getSearchFieldNames() {
           
            return {
                Customer: this.env._t('client'),
            };
        }

        /*
            Fin de la partie associée au filtre des factures par rapport au client
        */
    }
    FacturesNonPayee.template = 'FacturesNonPayee';

    Registries.Component.add(FacturesNonPayee);

    return FacturesNonPayee;
});


