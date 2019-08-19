const express = require('express');

// создаём Express-приложение
const app = express();

// создаём маршрут для главной страницы
// http://localhost:8080/
app.get('/', function(req, res) {
  res.sendFile( __dirname + '/index.html');
});

// запускаем сервер на порту 8080
app.listen(3000);
// отправляем сообщение
console.log('Сервер стартовал!');
