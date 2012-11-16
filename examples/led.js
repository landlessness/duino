var arduino = require('../');

var board = new arduino.Board({
  debug: true,
  serialPort: '/dev/tty.usbserial-A6004osT'
});

var led = new arduino.Led({
  board: board,
  pin: 13
});

board.on('ready', function(){
  led.blink();
});
