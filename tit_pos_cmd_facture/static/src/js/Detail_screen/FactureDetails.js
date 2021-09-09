odoo.define('tit_pos_cmd_facture.FactureDetails', function(require) {
    'use strict';

    const { _t } = require('web.core');
    const { getDataURLFromFile } = require('web.utils');
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class FactureDetails extends PosComponent {
        constructor() {
            super(...arguments);
        }
        
    }
    FactureDetails.template = 'FactureDetails';

    Registries.Component.add(FactureDetails);

    return FactureDetails;
});


