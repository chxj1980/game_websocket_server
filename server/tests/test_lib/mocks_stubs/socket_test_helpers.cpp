#include "tests/test_lib/mocks_stubs/socket_test_helpers.h"

#include <cstring> //for memset/memcpy*/
#include <string>
/*
0                   1                   2                   3
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+*/




std::string generateTestString(size_t size, size_t offset){ //makes a string of repeating acsii codes 33 through 126 (printable characters). Offset causes the string to start later in the pattern
	// !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
	// 33-126
	std::string output;
	output.resize(size);
	for(size_t i =0; i< size; ++i){
		output[i] = static_cast<char>( ( (i+offset)%94 )+33 );
	}
	return output;
}




std::string applyMask(const std::string &in, uint32_t mask){
	std::string result;
	size_t length =in.size();
	result.resize(length);

	memcpy(&result[0], &in[0], length);

	//set mask
	uint8_t *pMask = reinterpret_cast<uint8_t*>(&mask);

	volatile uint8_t* output = reinterpret_cast<volatile uint8_t*>(const_cast<volatile char*>(&result[0]));
	size_t i = 0;
	for (i = 0; i < length && ((size_t)&output[i])%8 != 0; ++i){ //mask output until output[] is 8byte aligned
		output[i] ^= pMask[i % 4];	//mask data by 'XOR'ing 4byte blocks with the mask one byte at a time
	}

	if(i < length){ //process the rest 64bits at a time
		uint64_t endBytes = (length-i) % 32; //run untill there are less than 4 8byte numbers left
		uint64_t length64 = length-endBytes;
		length64 /= 8; //convert length64 from number of bytes to number of 64bit ints

		volatile uint64_t *output64 = reinterpret_cast<volatile uint64_t*>(&output[i]);
		uint64_t offset= i;

		uint64_t mask64 = 0;
		volatile uint8_t *tempMask = reinterpret_cast<volatile uint8_t*>(&mask64);
		for(int j = 0; j<8; ++j, ++i){
			tempMask[j] = pMask[i % 4]; //build new 64bit mask starting were the previous loop left off (at i)
		}

		for (i = 0; i < length64; i+=4){//reset i to zero and start masking at the output64 pointer
			output64[i]   ^= mask64;	//mask data by 64bit 'XOR'ing
			output64[i+1] ^= mask64;
			output64[i+2] ^= mask64;
			output64[i+3] ^= mask64;
		}

		offset += i*8; //mask the last remaining bits
		endBytes += offset;
		for(i = offset; i<endBytes; i++){
			output[i] ^= pMask[i % 4];
		}
	}
	return result;
}




std::string createMaskFragmentHeader(int opcode, size_t _size, uint32_t mask){
	std::string output;
	//Create first fragment
	output.append(1,static_cast<char>(opcode));
	//set payload len and mask bit
	if(_size<=125){
		output.append(1,static_cast<char>(_size+128));
	}
	else if(_size<=65535){
		output.append(1,static_cast<char>(126+128));
		uint16_t size = static_cast<uint16_t>(_size);
		char *pSize = reinterpret_cast<char*>(&size);
		char size16 [2];
		size16[0]= pSize[1]; //network byte order
		size16[1]= pSize[0];
		output.append(size16,2);
	}
	else {
		output.append(1,static_cast<char>(127+128));
		uint64_t size = _size;
		char *pSize = reinterpret_cast<char*>(&size);
		char size64 [8];
		size64[0]= pSize[7]; //network byte order
		size64[1]= pSize[6];
		size64[2]= pSize[5];
		size64[3]= pSize[4];
		size64[4]= pSize[3];
		size64[5]= pSize[2];
		size64[6]= pSize[1];
		size64[7]= pSize[0];
		output.append(size64,8);
	}
	//set mask
	char *pMask = reinterpret_cast<char*>(&mask);
	output.append(pMask,4);

	return output;

}


std::string createMaskFragment(int opcode, const std::string &in, uint32_t mask){
	std::string output;
	output.append(std::move(createMaskFragmentHeader(opcode, in.size(), mask)));
	output.append(std::move(applyMask(in, mask)));
	return output;
}




std::string maskMessageForTesting(std::string in, uint32_t mask, bool binary, size_t fragmentSize){
	std::string output;
	int opcode = 0;

	if(in.size()>fragmentSize){ //multiple fragments
		size_t position =0;

		if(binary) opcode =1;
		else opcode = 2;

		std::string temp = in.substr (position, fragmentSize);
		output.append(createMaskFragment(opcode,temp, mask));
		position+=fragmentSize;

		//create middle fragments
		while(in.size()-position>fragmentSize){
			opcode = 0;//continuation opcode

			temp = in.substr (position, fragmentSize);
			output.append(createMaskFragment(opcode, temp, mask+static_cast<uint32_t>(position)));

			position+=fragmentSize;
		}

		//create last fragment
		opcode = 128; //fin
		temp = in.substr (position);
		output.append(createMaskFragment(opcode, temp, mask+static_cast<uint32_t>(position)));
	}
	else{ //one fragment
		//set first byte
		if(binary) opcode = 129;
		else opcode = 130;

		output.append(createMaskFragment(opcode, in, mask));
	}
	return output;
}

std::string createCloseControlMessage(){
	// 10001000  10000001 00000000 00000000 00000000 00000000 00000000
	// 136       129     |                mask               |  data

	std::string output;
	output.append(1,static_cast<char>(136));
	output.append(1,static_cast<char>(129));
	output.append(5,static_cast<char>(0));
	return output;
}
