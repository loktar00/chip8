
var chip8 = function(){
	// setup the canvas as the screen
	var canvas =  document.getElementById("screen");

	this.screen = canvas.getContext("2d");
	this.pixSize = 10;
	this.width = 64*this.pixSize;
	this.height = 32*this.pixSize;

	canvas.width = this.width;
	canvas.height = this.height;

	this.init();
} 

chip8.prototype.init = function(){
	this.memory = [4096];
	this.register = [16];
	this.stack = [16];
	this.i = null;
	this.display = new Array(64*32);
	this.displayFlag = false;
	this.step = 0;

	// program counter
	this.pc = 0x200;
	// stack pointer;
	this.sp = null;

	this.opcode = null;
	this.keys = [];
	this.keyMap = {
            49: 0x1,  // 1
            50: 0x2,  // 2
            51: 0x3,  // 3
            52: 0x4,  // 4
            81: 0x5,  // Q
            87: 0x6,  // W
            69: 0x7,  // E
            82: 0x8,  // R
            65: 0x9,  // A
            83: 0xA,  // S
            68: 0xB,  // D
            70: 0xC,  // F
            90: 0xD,  // Z
            88: 0xE,  // X
            67: 0xF,  // C
            86: 0x10  // V
        };

    this.currentKey = false;

	this.delayTimer = 0;
	this.soundTimer = 0;

	var fontSet = [ 
				0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
				0x20, 0x60, 0x20, 0x20, 0x70, // 1
				0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
				0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
				0x90, 0x90, 0xF0, 0x10, 0x10, // 4
				0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
				0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
				0xF0, 0x10, 0x20, 0x40, 0x40, // 7
				0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
				0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
				0xF0, 0x90, 0xF0, 0x90, 0x90, // A
				0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
				0xF0, 0x80, 0x80, 0x80, 0xF0, // C
				0xE0, 0x90, 0x90, 0x90, 0xE0, // D
				0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
				0xF0, 0x80, 0xF0, 0x80, 0x80  // F
	];

	for(var i = 0; i < fontSet.length; i++){
		this.memory[i] = fontSet[i];
	}
}

chip8.prototype.loadRom = function(rom){
	for(i = 0, len = rom.length; i < len; i++){
		// load the rom into memory, start at the offset value of mem
		this.memory[0x200 + i] = rom[i];
	}
	this.cycle();
}

chip8.prototype.cycle = function(){
	// figure out opcode
	this.opCode();

	this.step++;
	if(this.step % 2){
		if(this.delayTimer > 0){
			this.delayTimer --;
		}
	}

	//draw to the screen
	if(this.displayFlag){
		// draw
		//this.screen.clearRect(0,0,this.width, this.height);

		for(var i = 0; i < this.display.length; i++){

			var x = (i % 64),
					y = Math.floor(i / 64);

			if(this.display[i] == 1){
				this.screen.fillStyle = "black";
				this.screen.fillRect(x*this.pixSize,y*this.pixSize,this.pixSize,this.pixSize);
			}else{
				this.screen.fillStyle = "gray";
				this.screen.fillRect(x*this.pixSize,y*this.pixSize,this.pixSize,this.pixSize);
			}
		}
		this.displayFlag = false;
	}
	var self = this;
	setTimeout(this.cycle.bind(this),1)
	//requestAnimationFrame(this.cycle.bind(this));
}

chip8.prototype.opCode = function(){
	var pc = this.pc,
		opcode = this.memory[pc] << 8 | this.memory[pc + 1],
		vX = (opcode & 0x0F00) >> 8,
		vY = (opcode & 0x00F0) >> 4;
		this.pc+=2;

	switch(opcode & 0xF000){
		case 0x0000:
			switch(opcode & 0x00FF){							
				case 0x00E0:
					// Clear the display.
					for(var i = 0; i < this.display.length; i++){
						this.display[i] = 0;
					}
					this.displayFlag = true;
					break;							
				case 0x00EE:
					// Return from a subroutine.
					this.pc = this.stack[this.sp];
					this.sp--;
					break;
			}
			break;					
		case 0x1000:
			// Jump to location nnn.
			this.pc = opcode & 0x0FFF;
			break;
		case 0x2000:
			// call subroutine at location nnn.
			this.sp++;
			this.stack[this.sp] = this.pc;
			this.pc = opcode & 0x0FFF;
			break;
		case 0x3000:
			// Skip next instruction if Vx = kk.
			if(this.register[vX] == (opcode & 0x00FF)){
				this.pc+=2;
			}
			break;
		case 0x4000:
			// Skip next instruction if Vx != kk.
			if(this.register[vX] !== opcode & 0x00FF){
				this.pc+=2;
			}
			break;
		case 0x5000:
			// Skip next instruction if Vx = Vy.
			if(this.register[vX] == this.register[vY]){
				this.pc+=2;
			}
			break;
		case 0x6000:
			// The interpreter puts the value kk into register Vx.
			this.register[vX] = opcode & 0x00FF;
			break;
		case 0x7000:
			// Set Vx = Vx + kk.
			this.register[vX] += opcode & 0x00FF;

			if(this.register[vX] > 255){
				this.register[vX] -= 256;
			}
			break;
		case 0x8000:
			switch (opcode & 0x000F){
				case 0x0000:
					// Set Vx = Vy.
					this.register[vX] = this.register[vY];
					break;
				case 0x0001:
					// Set Vx = Vx OR Vy.
					this.register[vX] |= this.register[vY]; 
					break;
				case 0x0002:
					// Set Vx = Vx AND Vy.
					this.register[vX] &= this.register[vY]; 
					break;
				case 0x0003:
					// Set Vx = Vx XOR Vy.
					this.register[vX] ^= this.register[vY]; 
					break;
				case 0x0004:
					// Set Vx = Vx + Vy, set VF = carry.
					// The values of Vx and Vy are added together. If the result is greater than 8 bits (i.e., > 255,) VF is set to 1, otherwise 0. Only the lowest 8 bits of the result are kept, and stored in Vx.

					this.register[vX] += this.register[vY];

					if(this.register[vX] > 255){
						this.register[0xF] = 1;
						this.register[vX]  -= 256;
					}else{
						this.register[0xF] = 0;
					}

					if(this.register[vX] > 255){
						this.register[vX] -= 256;
					}
					break;
				case 0x0005:
					// Set Vx = Vx - Vy, set VF = NOT borrow.
					// If Vx > Vy, then VF is set to 1, otherwise 0. Then Vy is subtracted from Vx, and the results stored in Vx.
	
					if(this.register[vX] > this.register[vY]){
						this.register[0xF] = 1;
					}else{
						this.register[0xF] = 0;
					}
					
					this.register[vX] -= this.register[vY];
				  	if (this.register[vX] < 0) {
                         this.register[vX] += 256;
                	}
					break;
				case 0x0006:
					// Set Vx = Vx SHR 1.
					// If the least-significant bit of Vx is 1, then VF is set to 1, otherwise 0. Then Vx is divided by 2.
					this.register[0xF] = this.register[vX] & 0x1
             		this.register[vX] >>= 1;
					break;
				case 0x0007:
					// If Vy > Vx, then VF is set to 1, otherwise 0. Then Vx is subtracted from Vy, and the results stored in Vx.
					// Set Vx = Vy - Vx, set VF = NOT borrow.
					if(this.register[vY] > this.register[vX]){
						this.register[0xF] = 1;
					}else{
						this.register[0xF] = 0;
					}
					this.register[vX] = this.register[vY] - this.register[vX];
					if(this.register[vX] < 0){
						this.register[vX] += 256;
					}
					break;
				case 0x000E:
					// Set Vx = Vx SHL 1.
					// If the most-significant bit of Vx is 1, then VF is set to 1, otherwise to 0. Then Vx is multiplied by 2.
					this.register[0xF] = +(this.register[vX] & 0x80);
					this.register[vX] <<= 1;
					if(this.register[vX] > 255){
						this.register[vX] -= 256;
					}
					break;
			}
			break;
		case 0x9000:
			// Skip next instruction if Vx != Vy.
			if(this.register[vX] != this.register[vY]){
				this.pc += 2;
			}
			break;
		case 0xA000:
			// Set I = nnn.
			this.i = opcode & 0x0FFF;
			break;
		case 0xB000:
			// Jump to location nnn + V0.
			// The program counter is set to nnn plus the value of V0.
			this.pc = (opcode & 0x0FFF)+this.register[0];
			break;
		case 0xC000:
			// Set Vx = random byte AND kk.
			// The interpreter generates a random number from 0 to 255, which is then ANDed with the value kk. The results are stored in Vx. See instruction 8xy2 for more information on AND.
			this.register[vX] = Math.floor(Math.random()*0xFF) & (opcode & 0x00FF);
			break;
		case 0xD000:
			// Dxyn - DRW Vx, Vy, nibble
			// Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
			/* The interpreter reads n bytes from memory, starting at the address stored in I. These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). Sprites are XORed onto the existing screen. 
				If this causes any pixels to be erased, VF is set to 1, otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, 
				it wraps around to the opposite side of the screen. See instruction 8xy3 for more information on XOR, and section 2.4, Display, for more information on the Chip-8 screen and sprites. 
			*/
			var height = opcode & 0x000F,
				rX = this.register[vX],
				rY = this.register[vY];

			// set collision bit off	
			this.register[0xF] = 0;

			for(var yy = 0; yy < height; yy++){
				var curPix = this.memory[this.i + yy];
				for(var xx = 0; xx < 8; xx++){
					if(curPix & 0x80){
						var x = rX + xx,
							y = rY + yy;

						if(x >= 64){
							x-= 64;
						}
						if(x < 0){
							x += 64;
						}

						if(y >= 32){
							y-= 32;
						}
						if(y < 0){
							y += 32;
						}
						if(this.display[y * 64 + x] == 1){
							this.register[0xF] = 1;
						}
						this.display[y * 64 + x] ^= 1; 
					}
					// shift to the next pixel 
					curPix <<=1;
				}
			}
			this.displayFlag = true;
			break;
		case 0xE000:
			switch(opcode & 0x00FF){
				case 0x0099:
					// Skip next instruction if key with the value of Vx is pressed.
					if(this.keys[this.register[vX]]){
						this.pc+=2;
					}
					break;
				case 0x00A1:
					// Skip next instruction if key with the value of Vx is not pressed.
					if(!this.keys[this.register[vX]]){
						this.pc+=2;
					}
					break;
			}
			break;
		case 0xF000:
			switch(opcode & 0x00FF){
				case 0x0007:
					// Set Vx = delay timer value.
					this.register[vX] = this.delayTimer;
					break;
				case 0x000A:
					// Wait for a key press, store the value of the key in Vx.
					if(!chip.currentKey){
						return;
					}else{
						this.register[vX] = this.currentKey;
					}
					break;
				case 0x0015:
					// Set delay timer = Vx.
					this.delayTimer = this.register[vX];
					break;
				case 0x0018:
					// Set sound timer = Vx.
					break;
				case 0x001E:
					// Set I = I + Vx.
					this.i += this.register[vX];
					break;
				case 0x0029:
					// Set I = location of sprite for digit Vx.
					this.i = this.register[vX] * 5;
					break;
				case 0x0033:
					// Store BCD representation of Vx in memory locations I, I+1, and I+2.
					var number = this.register[vX];

					for (var i = 3; i > 0; i--) {
                         this.memory[this.i + i - 1] = parseInt(number % 10);
                         number /= 10;
                     }
					break;
				case 0x0055:
					// Store registers V0 through Vx in memory starting at location I.
					// The interpreter copies the values of registers V0 through Vx into memory, starting at the address in I.
					for(var i = 0; i <= vX; i++){
						this.memory[this.i + i] = this.register[i];
					}

					break;
				case 0x0065:
					// Read registers V0 through Vx from memory starting at location I.
					// The interpreter reads values from memory starting at location I into registers V0 through Vx.
					for(var i = 0; i <= vX; i++){
						this.register[i] = this.memory[this.i + i];
					}
					break;
			}
			break;
	}
}
