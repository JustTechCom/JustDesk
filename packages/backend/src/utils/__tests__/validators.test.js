const { isValidRoomId, isValidPassword, sanitizeInput } = require('../validators');

describe('validators utility functions', () => {
  describe('isValidRoomId', () => {
    it('returns true for a valid 9-digit room ID', () => {
      expect(isValidRoomId('123456789')).toBe(true);
    });

    it('returns false for invalid room IDs', () => {
      expect(isValidRoomId('12345678')).toBe(false); // too short
      expect(isValidRoomId('1234567890')).toBe(false); // too long
      expect(isValidRoomId('abcdefghi')).toBe(false); // non-digits
    });
  });

  describe('isValidPassword', () => {
    it('returns true for a valid password', () => {
      expect(isValidPassword('ABC123')).toBe(true);
    });

    it('returns false for invalid passwords', () => {
      expect(isValidPassword('abc123')).toBe(false); // lowercase letters
      expect(isValidPassword('ABC1234')).toBe(false); // too long
      expect(isValidPassword('AB!123')).toBe(false); // special character
    });
  });

  describe('sanitizeInput', () => {
    it('removes HTML tags and trims whitespace', () => {
      const input = "  <script>alert('x')</script>  ";
      expect(sanitizeInput(input)).toBe("alert('x')");
    });

    it('returns the same value for non-string inputs', () => {
      const obj = { test: 'value' };
      expect(sanitizeInput(obj)).toBe(obj);
    });
  });
});

