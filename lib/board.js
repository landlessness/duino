
var events = require('events'),
    child  = require('child_process'),
    util   = require('util'),
    colors = require('colors'),
    serial = require('serialport');

/*
 * The main Arduino constructor
 * Connect to the serial port and bind
 */
var Board = function (options) {
  this.log('info', 'initializing');
  this.debug = options && options.debug || false;
  this.writeBuffer = [];

  this.serialPort = options.serialPort || '/dev/tty.usbserial-A6004osT';

  var serialPort = new serial.SerialPort(this.serialPort, {
    baudrate: 115200,
    parser: serial.parsers.readline('\n')
  });
  this.init(serialPort, this);
}

  /*
 * EventEmitter, I choose you!
 */
util.inherits(Board, events.EventEmitter);


Board.prototype.init = function (serialPort, board) {
  board.emit('connected');

  var self = board;
  
  board.serial = serialPort;
  
  board.log('info', 'binding serial events');
  board.serial.on('data', function(data){
    self.log('receive', data.toString().red);
    self.emit('data', data);
  });

  setTimeout(function(){
    self.log('info', 'board ready');
    self.sendClearingBytes();

    if (self.debug) {
      self.log('info', 'sending debug mode toggle on to board');
      self.write('99' + self.normalizePin(0) + self.normalizeVal(1));
      process.on('SIGINT', function(){
        self.log('info', 'sending debug mode toggle off to board');
        self.write('99' + self.normalizePin(0) + self.normalizeVal(0));
        delete self.serial;
        setTimeout(function(){
          process.exit();
        }, 100);
      });
    }

    if (self.writeBuffer.length > 0) {
      self.processWriteBuffer();
    }

    self.emit('ready');      
  }, 500);
  // body...
}

/*
 * The board will eat the first 4 bytes of the session
 * So we give it crap to eat
 */
Board.prototype.sendClearingBytes = function () {
  this.serial.write('00000000');
}

/*
 * Process the writeBuffer (messages attempted before serial was ready)
 */
Board.prototype.processWriteBuffer = function () {
  this.log('info', 'processing buffered messages');
  while (this.writeBuffer.length > 0) {
    this.log('info', 'writing buffered message');
    this.write(this.writeBuffer.shift());
  }
}

/*
 * Low-level serial write
 */
Board.prototype.write = function (m) {
  if (this.serial) {
    this.log('write', m);
    this.serial.write('!' + m + '.');
  } else {
    this.log('info', 'serial not ready, buffering message: ' + m.red);
    this.writeBuffer.push(m);
  }
}

/*
 * Add a 0 to the front of a single-digit pin number
 */
Board.prototype.normalizePin = function (pin) {
  return this.lpad( 2, '0', pin );
}

Board.prototype.normalizeVal = function(val) {
	return this.lpad( 3, '0', val );
}

//
Board.prototype.lpad = function(len, chr, str) {
  return (Array(len + 1).join(chr || ' ') + str).substr(-len);
};

/*
 * Define constants
 */
Board.prototype.HIGH = '255';
Board.prototype.LOW = '000';

/*
 * Set a pin's mode
 * val == out = 001
 * val == in  = 000
 */
Board.prototype.pinMode = function (pin, val) {
  pin = this.normalizePin(pin);
  this.log('info', 'set pin ' + pin + ' mode to ' + val);
  val = (
    val == 'out' ?
    this.normalizeVal(1) :
    this.normalizeVal(0)
  );
  this.write('00' + pin + val);
}

/*
 * Tell the board to write to a digital pin
 */
Board.prototype.digitalWrite = function (pin, val) {
  pin = this.normalizePin(pin);
  val = this.normalizeVal(val);
  this.log('info', 'digitalWrite to pin ' + pin + ': ' + val.green);
  this.write('01' + pin + val);
}

/*
 * Tell the board to extract data from a pin
 */
Board.prototype.digitalRead = function (pin) {
  pin = this.normalizePin(pin);
  this.log('info', 'digitalRead from pin ' + pin);
  this.write('02' + pin + this.normalizeVal(0));
}

Board.prototype.analogWrite = function (pin, val) {
	pin = this.normalizePin(pin);
	val = this.normalizeVal(val);
	this.log('info', 'analogWrite to pin ' + pin + ': ' + val.green);
	this.write('03' + pin + val);
}
Board.prototype.analogRead = function (pin) {
	pin = this.normalizePin(pin);
	this.log('info', 'analogRead from pin ' + pin);
	this.write('04' + pin + this.normalizeVal(0));
}

/*
 * Utility function to pause for a given time
 */
Board.prototype.delay = function (ms) {
  ms += +new Date();
  while (+new Date() < ms) { }
}

/*
 * Logger utility function
 */
Board.prototype.log = function (/*level, message*/) {
  var args = [].slice.call(arguments);
  if (this.debug) {
    console.log(String(+new Date()).grey + ' duino '.blue + args.shift().magenta + ' ' + args.join(', '));
  }
}

module.exports = Board;
