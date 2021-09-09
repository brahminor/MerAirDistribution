odoo.define('tit_pos_order.verif_group_user', function (require) {
    "use strict";
    const PosComponent = require('point_of_sale.PosComponent');
    const { update_css } = require('tit_pos_order.CustomCashierScreen')
    const rpc = require('web.rpc');
    const verif_groupe = async () => {
        /* cette fonction permet de vérifier le groupe associé à l'utilisateur
        connecté à la session afin de lui mettre les bouton necessaire visibles
        et autre invisible selon le groupe trouvé.
        */
        let user = {}

        const order = PosComponent.env.pos.get_order();
        user['id_user'] = PosComponent.env.pos.user.id

        let result = await rpc.query({
            model: 'res.users',
            method: 'verification_groupe',
            args: [user],
        });
        if (result == 1) {
            // mettre le bouton "payer" invisible si le groupe trouvé est vendeur
            var contents = $('.pos-content');
            contents.find(".pay").hide();
            $("div#btn_invoice").hide();
        }
        else if (result == 2) {
            update_css();
        }
    };

    return { verif_groupe }
});