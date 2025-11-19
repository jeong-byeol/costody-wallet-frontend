// src/lib/errors.ts
export const ERROR_MAP: Record<string, string> = {
    FROZEN_ACCOUNT: '계정이 동결되어 출금이 제한됩니다.',
    POLICY_CHECK_FAIL: '정책 검증에 실패했습니다. 화이트리스트/한도를 확인하세요.',
    INSUFFICIENT_FUNDS: '금고 잔액이 부족합니다. 잠시 후 다시 시도하세요.',
    NONCE_CONFLICT: '네트워크 혼잡입니다. 잠시 후 자동 재시도합니다.',
    INVALID_ADDRESS: '올바르지 않은 주소 형식입니다.',
    INVALID_AMOUNT: '올바르지 않은 금액입니다.',
    DAILY_LIMIT_EXCEEDED: '일일 한도를 초과했습니다.',
    NOT_WHITELISTED: '화이트리스트에 등록되지 않은 주소입니다.',
    UNAUTHORIZED: '인증이 필요합니다. 다시 로그인해주세요.',
    NETWORK_ERROR: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  };
  
  export const getErrorMessage = (errorCode: string): string => {
    return ERROR_MAP[errorCode] || '알 수 없는 오류가 발생했습니다.';
  };