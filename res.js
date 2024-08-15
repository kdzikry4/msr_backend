'use strict';

exports.ok = function(values, res) {
  var data = {
      'status': 200,
      'values': values
  };
  res.json(data);
  res.end();
};

exports.fail = function(values, res) {
  var data = {
      'status': 400,
      'values': values
  };
  res.json(data);
  res.end();
};

exports.faillogin = function(values, res) {
  var data = {
      'status': 401,
      'values': values
  };
  res.status(401);
  res.json(data);
  res.end();
};