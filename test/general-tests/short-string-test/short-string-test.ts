import { expect } from "chai";
import { starknet } from "hardhat";

describe("Starknet", function () {
  this.timeout(300_000); 

  const inputString = "hello";
  const convertedString = BigInt(448378203247);

  const invalidLengthString = "string with more than 31 characters";

  const exactString = "string w/ exactly 31 characters";
  const convertedExactString = BigInt(203991099562869677407395550498274557187023598428675066738548183291570516595);
  const largeString = "string wi/ exactly 32 characters";
  const invalidCharacterString = "invalid char ÿ";

  it("should convert a valid string to a BigInt", async function() {
    const convertedInput = starknet.stringToBigInt(inputString);
    expect(convertedInput).to.deep.equal(convertedString);
  });

  it("should convert a string with exactly 31 characters to a BigInt", async function() {
    const convertedInput = starknet.stringToBigInt(exactString);
    expect(convertedInput).to.deep.equal(convertedExactString);
  });

  it("should convert a BigInt to a string", async function() {
    const convertedOutput = starknet.bigIntToString(convertedString);
    expect(convertedOutput).to.deep.equal(inputString);
 
  });

  it("should fail when a string has exactly 32 characters", async function() {
    
    try{
      starknet.stringToBigInt(largeString);
      expect.fail("Should have failed on converting a string with more than 31 characters.");
    } catch (err: any) {
      expect(err.message).to.deep.equal("Strings must have a max of 31 characters.");
    }
  });

  it("should fail when a string has over 31 characters", async function() {
    
    try{
      starknet.stringToBigInt(invalidLengthString);
      expect.fail("Should have failed on converting a string with more than 31 characters.");
    } catch (err: any) {
      expect(err.message).to.deep.equal("Strings must have a max of 31 characters.");
    }
  });

  it("should fail when a string has an invalid ASCII character", async function() {
    
    try{
      starknet.stringToBigInt(invalidCharacterString);
      expect.fail("Should have failed on converting a string with an invalid ASCII character.");
    } catch (err: any) {
      expect(err.message).to.deep.equal("Input string contains an invalid ASCII character.");
    }
  });
});
