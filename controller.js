'use strict';
var crypto = require('crypto');

var jwt = require('jsonwebtoken');

var response = require('./res');
var connection = require('./conn');

exports.users = function(req, res) {
    var queryUser = 'SELECT * FROM user'
    if (req.query.reseller == 'true') {
        queryUser += ' WHERE user_tipe = "reseller"'
    }
    connection.query(queryUser, function (error, rows, fields){
        if(error){
            console.log(rows)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.login = function(req, res) {
    connection.query('SELECT * FROM user WHERE user_hp = ?', [req.body.user_hp], function (error, rows, fields){
        if(error || rows.length == 0){
            console.log(error)
            response.fail("Gagal", res)                         
        } else{
            var user_password = 'msr'+req.body.user_password+'rr';
            var hash = crypto.createHash('md5').update(user_password).digest('hex');
            if (hash === rows[0].user_password){
                var token = jwt.sign({ 
                    user_id: rows[0].user_id,
                    user_nama: rows[0].user_nama,
                    user_tipe: rows[0].user_tipe,
                  }, 'msrrr', { expiresIn: '1day' });
                response.ok(token, res)
            } else{
                response.fail("Gagal", res)
            }
        }
    });
};

exports.profile = function(req, res) {
    if(req.user){
        response.ok(req.user, res)
    } else{
        response.fail("Gagal profile", res)
    }
};

exports.barang = function(req, res) {
    connection.query('SELECT * FROM barang', function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.createTransaksi = function(req, res) {
    var transaksi_no = req.body.transaksi_no;
    var transaksi_tipe = req.body.transaksi_tipe;
    var transaksi_catatan = req.body.transaksi_catatan;
    var transaksi_reseller_user = req.body.transaksi_reseller_user;
    var transaksi_dibuat_user = req.user.user_id;

    var items_valid = []
    for (let i = 0; i < req.body.transaksi_item.length; i++) {
        if (req.body.transaksi_item[i].id != 0) {
            items_valid.push(req.body.transaksi_item[i])
        }
    }
    if (items_valid.length == 0) {
        response.fail("Gagal menambahkan transaksi! Item kosong!", res)
        return
    }

    connection.query('INSERT INTO transaksi (transaksi_no, transaksi_tipe, transaksi_catatan, transaksi_dibuat_user, transaksi_reseller_user, transaksi_dibuat_waktu) values (?,?,?,?,?,now())',
    [ transaksi_no, transaksi_tipe, transaksi_catatan, transaksi_dibuat_user, transaksi_reseller_user ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal menambahkan transaksi!", res)
        } else{
            createTransaksiItem(req, res, items_valid, rows.insertId, transaksi_tipe)
        }
    });
};

var createTransaksiItem = function(req, res, items_valid, transaksi_id, transaksi_tipe) {
    var items_insert = []
    for (let i = 0; i < items_valid.length; i++) {
        items_insert.push([transaksi_id, items_valid[i].id, items_valid[i].jumlah])
    }
    
    connection.query('INSERT INTO transaksi_item (transaksi_item_transaksi_id, transaksi_item_barang_id, transaksi_item_jumlah) values ?',
    [ items_insert ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal menambahkan transaksi item!", res)
        } else{
            for (let i = 0; i < items_valid.length; i++) {
                updateJumlahBarang(transaksi_tipe, items_valid[i].id, items_valid[i].jumlah)
            }
            response.ok("Berhasil menambahkan transaksi item!", res)
        }
    });
};

var updateJumlahBarang = function(transaksi_tipe, barang_id, jumlah) {
    var queryUpdateJumlahBarang = 'UPDATE barang SET barang_jumlah = barang_jumlah + ? WHERE barang_id = ? '
    if (transaksi_tipe.toLocaleLowerCase() == "out") {
        queryUpdateJumlahBarang = 'UPDATE barang SET barang_jumlah = barang_jumlah - ? WHERE barang_id = ? '
    }
    connection.query(queryUpdateJumlahBarang,
    [ jumlah, barang_id ], 
    function (error, rows, fields){
        if(error){
            console.log("Gagal update jumlah barang transaksi item: " + barang_id)
        } else{
            console.log("Berhasil update jumlah barang transaksi item: " + barang_id)
        }
    });
};

exports.dashboardTersedia = function(req, res) {
    var queryTersedia = `SELECT barang_jenis, SUM(barang_jumlah) as tersedia FROM barang GROUP BY barang_jenis`
    connection.query(queryTersedia, function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.dashboardTerjual = function(req, res) {
    var queryTerjual = `
    SELECT barang_jenis, SUM(transaksi_item_jumlah) as terjual FROM transaksi_item
    JOIN barang ON barang_id = transaksi_item_barang_id
    JOIN transaksi ON transaksi_id = transaksi_item_transaksi_id
    WHERE transaksi_tipe = 'out'
    GROUP BY barang_jenis
    `
    connection.query(queryTerjual, function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.dashboardTransaksi = function(req, res) {
    var queryTransaksi = `SELECT COUNT(transaksi_id) as transaksi_out FROM transaksi WHERE transaksi_tipe = 'out'`
    connection.query(queryTransaksi, function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

// SELECT barang_jenis, SUM(barang_jumlah) as tersedia FROM barang GROUP BY barang_jenis

// SELECT barang_jenis, SUM(transaksi_item_jumlah) as terjual FROM transaksi_item
// JOIN barang ON barang_id = transaksi_item_barang_id
// JOIN transaksi ON transaksi_id = transaksi_item_transaksi_id
// WHERE transaksi_tipe = 'out'
// GROUP BY barang_jenis

// SELECT COUNT(transaksi_id) as transaksi_out FROM transaksi WHERE transaksi_tipe = 'out'

// =======================================================================================================================================
exports.transaksi = function(req, res) {
    connection.query('SELECT t.id_transaksi, t.tgl, r.id_ruang, r.nm_ruang, u.id_user, u.display_nm, t.activity, s.id_snack, s.nm_snack, t.additional FROM transaksi t JOIN `user` u ON t.id_user = u.id_user JOIN ruang r ON t.id_ruang = r.id_ruang JOIN snack s ON t.id_snack = s.id_snack', function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.transaksiuser = function(req, res) {
    connection.query('SELECT t.id_transaksi, t.tgl, r.id_ruang, r.nm_ruang, u.display_nm, t.activity, s.id_snack, s.nm_snack, t.additional FROM transaksi t JOIN `user` u ON t.id_user = u.id_user JOIN ruang r ON t.id_ruang = r.id_ruang JOIN snack s ON t.id_snack = s.id_snack', function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.id = function(req, res) {
    connection.query('SELECT * FROM user WHERE id = ?', [req.query.id], function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.index = function(req, res) {
    response.ok("Hello from the Node JS RESTful side!", res)
};

exports.findUsers = function(req, res) {
    var user_id = req.params.user_id;

    connection.query('SELECT * FROM user where id = ?',
    [ user_id ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
        } else{
            response.ok(rows, res)
        }
    });
};

exports.createUsers = function(req, res) {
    var user = req.body.user;
    var jenis = req.body.jenis;
    var password = 'msr'+req.body.password+'rr';
    var hp = req.body.hp;

    connection.query('INSERT INTO user (user_nama, user_jenis, user_password, user_hp) values (?,md5(?),?,?,?,0)',
    [ user, jenis, password, hp ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal menambahkan user!", res)
        } else{
            response.ok("Berhasil menambahkan user!", res)
        }
    });
};

exports.updateUsers = function(req, res) {
    var id_user = req.body.id_user;
    var user = req.body.user;
    var password = req.body.password;
    var display_nm = req.body.display_nm;
    var email = req.body.email;
    var cost_center = req.body.cost_center;

    connection.query('UPDATE user SET user = ?, password = ?, display_nm = ?, email = ?, cost_center = ? WHERE id_user = ?',
    [ user, password, display_nm, email, cost_center, id_user ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal merubah user!", res)
        } else{
            response.ok("Berhasil merubah user!", res)
        }
    });
};

exports.updateTransaksi = function(req, res) {
    var tgl = req.body.tgl;
    var id_ruang = req.body.id_ruang;
    var id_user = req.body.id_user;
    var activity = req.body.activity;
    var id_snack = req.body.id_snack;
    var additional = req.body.additional;
    var id_transaksi = req.body.id_transaksi;

    connection.query('UPDATE transaksi SET tgl = ?, id_ruang = ?, id_user = ?, activity = ?, id_snack = ?, additional = ? WHERE id_transaksi = ?',
    [ tgl, id_ruang, id_user, activity, id_snack, additional, id_transaksi ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal merubah user!", res)
        } else{
            response.ok("Berhasil merubah user!", res)
        }
    });
};

exports.deleteUsers = function(req, res) {
    var id_user_id = req.body.id_user;

    connection.query('DELETE FROM user WHERE id_user = ?',
    [ id_user ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal menghapus user!", res)
        } else{
            response.ok("Berhasil menghapus user!", res)
        }
    });
};

exports.deleteTransaksi = function(req, res) {
    var id_transaksi = req.params.id_transaksi;

    connection.query('DELETE FROM transaksi WHERE id_transaksi = ?',
    [ id_transaksi ], 
    function (error, rows, fields){
        if(error){
            console.log(error)
            response.fail("Gagal menghapus transaksi!", res)
        } else{
            response.ok("Berhasil menghapus transaksi!", res)
        }
    });
};

