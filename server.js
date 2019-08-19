const path = require('path');
const express = require('express');
const brain = require('brain.js');
const jsonfile = require('jsonfile');
// создаём Express-приложение
const app = express();
const neuralData = "neuralData.json";
const dataSet = "dataSet.json";

app.use('/', express.static(__dirname + '/front'));
app.use(express.json({limit: '150mb'}))
// создаём маршрут для главной страницы
// http://localhost:8080/
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.post('/sendTrain', function (req, res) {
    const net = req.body.data;
    jsonfile.writeFile(neuralData, net, function (err) {
      if (err) console.error(err)
    });
    console.log('add train to file');
});

app.post('/getTrain', function (req, res) {
    jsonfile.readFile(neuralData, function (err, obj) {
      if (err) console.error(err)
      res.send(obj)  
    })
    console.log('get train from file');
});
app.post('/sendData', function (req, res) {
    const data = req.body.data;
    jsonfile.writeFile(dataSet, data, function (err) {
      if (err) console.error(err)
    });
    console.log('add dataSet to file');
});

app.post('/getData', function (req, res) {
    jsonfile.readFile(dataSet, function (err, obj) {
      if (err) console.error(err)
      res.send(obj)  
    })
    console.log('get dataSet from file');
});

// запускаем сервер на порту 8080
app.listen(3000);
// отправляем сообщение
console.log('Сервер стартовал!');
