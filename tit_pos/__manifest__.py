# -*- encoding: utf-8 -*-
# Copyright 2021
{
    'name': "Tit pos solution",

    "version": "1.0.1",
    "author": "tit solution",
    "website": "",
    "sequence": 0,
    "depends": [
            "point_of_sale", "contacts", "web", "base"
    ],
    "category": "Point of Sale",
    'license': 'LGPL-3',
    "description": """
    """,
    "data": [
        'templates/point_of_sale_assets.xml',
        'views/res_partner_view.xml',
        'views/accountFiscalPosition_view.xml'
    ],
    'qweb': [
            "static/src/xml/Screens/ClientDetailsEdit.xml",
        ],
    'images': ['static/description/images/icon.png'],
    "auto_install": False,
    "installable": True,
    "application": False,
    
}