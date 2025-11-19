// src/lib/validators.ts
import { getAddress, isAddress } from 'viem';

/**
 * EIP-55 체크섬 주소 검증
 */
export const validateAddress = (address: string): boolean => {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
};

/**
 * 체크섬 주소로 변환
 */
export const toChecksumAddress = (address: string): `0x${string}` | null => {
  try {
    return getAddress(address);
  } catch {
    return null;
  }
};

/**
 * ETH 금액 검증 (0 < amount ≤ 79, 소수 6자리 제한)
 */
export const validateEthAmount = (amount: string): boolean => {
  try {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || num > 79) return false;

    // 소수점 자리수 체크 (최대 6자리)
    const decimals = amount.split('.')[1]?.length || 0;
    return decimals <= 6;
  } catch {
    return false;
  }
};

/**
 * 이메일 검증 (간단한 버전)
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 비밀번호 검증 (최소 8자, 영문+숫자 조합)
 */
export const validatePassword = (password: string): boolean => {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
};