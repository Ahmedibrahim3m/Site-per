import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt=promisify(scryptCallback);
export async function hashPassword(password:string){
  const salt=randomBytes(16).toString("hex");
  const key=(await scrypt(password,salt,64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password:string,stored:string){
  const [algo,salt,hex]=stored.split(":");
  if(algo!=="scrypt"||!salt||!hex||!/^[a-f0-9]{128}$/.test(hex))return false;
  const expected=Buffer.from(hex,"hex");
  const actual=(await scrypt(password,salt,expected.length)) as Buffer;
  return timingSafeEqual(actual,expected);
}
