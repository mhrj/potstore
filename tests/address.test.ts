import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeAddressInput } from '../src/lib/address';

describe('Address normalization', () => {
  it('normalizes a valid address payload and preserves the default flag', () => {
    const input = {
      label: 'HOME',
      fullName: '  علی رضایی  ',
      phone: '09121234567',
      province: 'تهران',
      provinceCode: '8',
      city: 'تهران',
      cityCode: 801,
      postalCode: ' 1234567890 ',
      line1: 'خیابان ولیعصر',
      line2: ' پلاک ۱۲ ',
      isDefault: true,
    };

    const result = normalizeAddressInput(input);

    assert.equal(result.label, 'HOME');
    assert.equal(result.fullName, 'علی رضایی');
    assert.equal(result.phone, '09121234567');
    assert.equal(result.province, 'تهران');
    assert.equal(result.provinceCode, 8);
    assert.equal(result.city, 'تهران');
    assert.equal(result.cityCode, 801);
    assert.equal(result.postalCode, '1234567890');
    assert.equal(result.line1, 'خیابان ولیعصر');
    assert.equal(result.line2, 'پلاک ۱۲');
    assert.equal(result.isDefault, true);
  });

  it('rejects invalid phone numbers and blank required fields with Persian validation text', () => {
    const input = {
      label: 'HOME',
      fullName: '',
      phone: '123',
      province: 'تهران',
      city: '',
      postalCode: '123',
      line1: '',
      line2: '',
      isDefault: false,
    };

    assert.throws(() => normalizeAddressInput(input), /نام|شماره|شهر|آدرس|کد پستی/i);
  });

  it('strictly validates phone number with strict Iranian mobile regex and rejects 09000000000', () => {
    const invalidNumbers = [
      '02112345678', // landline instead of mobile
      '09000000000', // 0900 is an invalid prefix
      '09060000000', // 0906 is invalid
      '09400000000', // 0940 is invalid (only 0941 allowed)
      '0912345',      // too short
      '091212345678', // too long
    ];

    for (const phone of invalidNumbers) {
      const base = {
        label: 'HOME',
        fullName: 'علی رضایی',
        phone,
        province: 'تهران',
        city: 'تهران',
        postalCode: '1234567890',
        line1: 'خیابان ولیعصر',
        isDefault: false,
      };

      assert.throws(
        () => normalizeAddressInput(base),
        (err: any) => err?.issues?.some((i: any) => i.message === 'شماره موبایل وارد شده معتبر نیست'),
        `Expected ${phone} to be rejected`,
      );
    }

    const validNumbers = [
      '09121234567',
      '09211234567',
      '09351234567',
      '09901234567',
      '09011234567',
      '09051234567',
      '09411234567',
    ];

    for (const phone of validNumbers) {
      const base = {
        label: 'HOME',
        fullName: 'علی رضایی',
        phone,
        province: 'تهران',
        city: 'تهران',
        postalCode: '1234567890',
        line1: 'خیابان ولیعصر',
        isDefault: false,
      };

      const result = normalizeAddressInput(base);
      assert.equal(result.phone, phone);
    }
  });

  it('strictly validates postal code with 10 digits and exact Persian error message', () => {
    const base = {
      label: 'HOME',
      fullName: 'علی رضایی',
      phone: '09121234567',
      province: 'تهران',
      city: 'تهران',
      postalCode: '12345', // 5 digits instead of 10
      line1: 'خیابان ولیعصر',
      isDefault: false,
    };

    assert.throws(
      () => normalizeAddressInput(base),
      (err: any) => err?.issues?.some((i: any) => i.message === 'کد پستی باید دقیقاً ۱۰ رقم باشد'),
    );
  });
});
