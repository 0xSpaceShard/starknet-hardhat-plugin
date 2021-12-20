import { expect } from "chai";
import { bigIntToStringUtil, stringToBigIntUtil } from "../../../src/extend-utils";

describe("Starknet", function () {
  this.timeout(300_000); 

  const inputString = "hello";
  let convertedString : BigInt = BigInt(448378203247);

  const largeString = "string with more than 31 characters";
  const invalidCharacterString = "invalid char ÿ";

  it("should convert a valid string to a BigInt", async function() {
    const convertedInput = stringToBigIntUtil(inputString);
    expect(convertedInput).to.deep.equal(convertedString);
  });

  it("should convert a BigInt to a string", async function() {
    const convertedOutput = bigIntToStringUtil(convertedString);
    expect(convertedOutput).to.deep.equal(inputString);
 
  });

  it("should fail when a string has over 31 characters", async function() {
    
    try{
      stringToBigIntUtil(largeString);
      expect.fail("Should have failed on converting a string with more than 31 characters.");
    } catch (err: any) {
      expect(err.message).to.deep.equal("Strings must have a max of 31 characters.");
    }
  });

  it("should fail when a string has an invalid ASCII character", async function() {
    
    try{
      stringToBigIntUtil(invalidCharacterString);
      expect.fail("Should have failed on converting a string with an invalid ASCII character.");
    } catch (err: any) {
      expect(err.message).to.deep.equal("Input string contains an invalid ASCII character.");
    }
  });
});
