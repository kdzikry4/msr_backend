'use strict';

var jwt = require('jsonwebtoken');
var response = require('./res');

module.exports = function(app) {
    var controller = require('./controller');

    var cekLogin = function (req, res, next) {
        try {
            var token = req.get('authorization') || req.body.token || req.query.token
            var decoded = jwt.verify(token, 'msrrr');
            req.user = decoded
            console.log(decoded)
            next()
        } catch (error) {
            response.faillogin('Belum login', res)
        }      
    }

    var cekAdmin = function (req, res, next) {
        if (req.user.user_tipe === 'admin') {
            next()
        } else {
            response.fail('Bukan admin', res)
        }
    }

    app.route('/')
        .get(controller.index);

    app.route('/login')
        .post(controller.login);
    
    app.route('/profile')
        .get(cekLogin, controller.profile);

    app.route('/barang')
        .get(cekLogin, controller.barang);

    app.route('/transaksi')
        .post(cekLogin, controller.createTransaksi);

    app.route('/dashboard-tersedia')
        .get(cekLogin, controller.dashboardTersedia);

    app.route('/dashboard-terjual')
        .get(cekLogin, controller.dashboardTerjual);

    app.route('/dashboard-transaksi')
        .get(cekLogin, controller.dashboardTransaksi);

    app.route('/users')
        .get(cekLogin, controller.users);

// =========================================================================
    app.route('/transaksi')
        .get(cekLogin, cekAdmin, controller.transaksi);

    app.route('/transaksiuser')
        .get(cekLogin, controller.transaksi);

    app.route('/id')
        .get(controller.id);

    app.route('/users/:user_id')
        .get(controller.findUsers);

    app.route('/users')
        .post(controller.createUsers);

    app.route('/users')
        .put(controller.updateUsers);
        
    app.route('/transaksi')
        .post(cekLogin, controller.createTransaksi);
    
    app.route('/transaksi')
        .put(cekLogin, cekAdmin, controller.updateTransaksi);
    
    app.route('/users')
        .delete(controller.deleteUsers);

    app.route('/transaksi/:id_transaksi')
        .delete(cekLogin, cekAdmin, controller.deleteTransaksi);
};