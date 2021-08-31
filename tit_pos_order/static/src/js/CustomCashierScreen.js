odoo.define('tit_pos_order.CustomCashierScreen', function(require) {
    "use strict";
     const update_css=()=> {
        $('div.product-list').addClass('pointer-none');
        $('div.product-img').removeClass('product-img').addClass('overlay-screen');
        var contents = $('.pos-content');
        contents.find(".ctrl_btn").hide();
        contents.find(".set-customer").hide();
        contents.find(".selected-mode").attr("disabled", true).css({'cursor':'not-allowed'});
        };

  return {update_css}
});