import { StoreSettings } from './types';

export const CATEGORIES = ['General', 'Bebidas', 'Alimentos', 'Limpieza', 'Electrónica', 'Hogar', 'Otros'];

export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'PosGo! Store',
  currency: 'S/',
  taxRate: 0.18, // IGV Peru standard
  pricesIncludeTax: true,
  address: 'Av. Principal 123, Lima',
  phone: '999-999-999'
};

export const MOCK_PRODUCTS = [
  { id: '1', name: 'Inca Kola 600ml', price: 3.50, category: 'Bebidas', stock: 50, barcode: '77501000' },
  { id: '2', name: 'Papas Lays 45g', price: 2.50, category: 'Alimentos', stock: 32, barcode: '75010001' },
  { id: '3', name: 'Galleta Casino', price: 1.20, category: 'Alimentos', stock: 15, barcode: '75010002' },
  { id: '4', name: 'Agua San Mateo', price: 2.00, category: 'Bebidas', stock: 100, barcode: '77502000' },
  { id: '5', name: 'Detergente Bolivar', price: 4.50, category: 'Limpieza', stock: 10, barcode: '77503000' }
];

export const COUNTRIES = [
    { code: '51', flag: '🇵🇪', name: 'Perú', length: 9, startsWith: '9', placeholder: '900 000 000' },
    { code: '54', flag: '🇦🇷', name: 'Argentina', length: 10, placeholder: '9 11 1234 5678' },
    { code: '591', flag: '🇧🇴', name: 'Bolivia', length: 8, placeholder: '7000 0000' },
    { code: '55', flag: '🇧🇷', name: 'Brasil', length: 11, placeholder: '11 91234 5678' },
    { code: '56', flag: '🇨🇱', name: 'Chile', length: 9, placeholder: '9 1234 5678' },
    { code: '57', flag: '🇨🇴', name: 'Colombia', length: 10, placeholder: '300 123 4567' },
    { code: '593', flag: '🇪🇨', name: 'Ecuador', length: 9, placeholder: '99 123 4567' },
    { code: '52', flag: '🇲🇽', name: 'México', length: 10, placeholder: '55 1234 5678' },
    { code: '595', flag: '🇵🇾', name: 'Paraguay', length: 9, placeholder: '981 123 456' },
    { code: '598', flag: '🇺🇾', name: 'Uruguay', length: 9, placeholder: '99 123 456' },
    { code: '58', flag: '🇻🇪', name: 'Venezuela', length: 10, placeholder: '414 123 4567' },
    { code: '34', flag: '🇪🇸', name: 'España', length: 9, placeholder: '600 123 456' },
    { code: '1', flag: '🇺🇸', name: 'USA', length: 10, placeholder: '202 555 0123' },
];