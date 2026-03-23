export const OTPService = {
  generate(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  },
  send(mobile: string): string {
    const otp = this.generate();
    const data = { otp, mobile, expiry: Date.now() + 5 * 60 * 1000 };
    localStorage.setItem('printease_otp_' + mobile, JSON.stringify(data));
    return otp;
  },
  verify(mobile: string, entered: string): 'valid' | 'expired' | 'wrong' | 'notfound' {
    const raw = localStorage.getItem('printease_otp_' + mobile);
    if (!raw) return 'notfound';
    const data = JSON.parse(raw);
    if (Date.now() > data.expiry) {
      localStorage.removeItem('printease_otp_' + mobile);
      return 'expired';
    }
    if (data.otp !== entered.trim()) return 'wrong';
    localStorage.removeItem('printease_otp_' + mobile);
    return 'valid';
  },
  clear(mobile: string): void {
    localStorage.removeItem('printease_otp_' + mobile);
  }
};
