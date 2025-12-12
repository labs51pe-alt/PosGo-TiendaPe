import { StoreSettings } from './types';

export const CATEGORIES = ['General', 'Bebidas', 'Alimentos', 'Limpieza', 'Cuidado Personal', 'Snacks', 'Otros'];

export const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Mi Bodega Demo',
  currency: 'S/',
  taxRate: 0.18, // IGV Peru standard
  pricesIncludeTax: true,
  address: 'Av. Larco 123, Miraflores',
  phone: '999-000-123'
};

export const MOCK_PRODUCTS = [
  // BEBIDAS
  { id: '1', name: 'Inca Kola 600ml', price: 3.50, category: 'Bebidas', stock: 45, barcode: '77501000' },
  { id: '2', name: 'Coca Cola 600ml', price: 3.50, category: 'Bebidas', stock: 50, barcode: '77501001' },
  { id: '3', name: 'Agua San Mateo 1L', price: 2.50, category: 'Bebidas', stock: 24, barcode: '77502000' },
  { id: '4', name: 'Cerveza Pilsen 650ml', price: 7.00, category: 'Bebidas', stock: 120, barcode: '77503000' },
  { id: '5', name: 'Sporade Tropical', price: 2.80, category: 'Bebidas', stock: 15, barcode: '77504000' },
  
  // SNACKS
  { id: '6', name: 'Papas Lays Clásicas', price: 2.00, category: 'Snacks', stock: 30, barcode: '75010001' },
  { id: '7', name: 'Doritos Queso', price: 2.20, category: 'Snacks', stock: 25, barcode: '75010002' },
  { id: '8', name: 'Galleta Oreo Paquete', price: 1.50, category: 'Snacks', stock: 60, barcode: '76223000' },
  { id: '9', name: 'Chocman', price: 1.20, category: 'Snacks', stock: 40, barcode: '77505000' },

  // ALIMENTOS
  { id: '10', name: 'Arroz Costeño 750g', price: 4.80, category: 'Alimentos', stock: 20, barcode: '77506000' },
  { id: '11', name: 'Aceite Primor 1L', price: 11.50, category: 'Alimentos', stock: 18, barcode: '77507000' },
  { id: '12', name: 'Leche Gloria Azul', price: 4.20, category: 'Alimentos', stock: 36, barcode: '77508000' },
  { id: '13', name: 'Atún Florida Filete', price: 6.50, category: 'Alimentos', stock: 50, barcode: '77509000' },

  // LIMPIEZA & CUIDADO
  { id: '14', name: 'Detergente Bolivar 900g', price: 14.50, category: 'Limpieza', stock: 12, barcode: '77510000' },
  { id: '15', name: 'Papel Hig. Suave (pack 4)', price: 6.00, category: 'Limpieza', stock: 15, barcode: '77511000' },
  { id: '16', name: 'Shampoo H&S 400ml', price: 18.90, category: 'Cuidado Personal', stock: 8, barcode: '77512000' },

  // PRODUCTO CON VARIANTES (DEMO)
  { 
      id: '17', 
      name: 'Panetón D\'Onofrio', 
      price: 28.00, 
      category: 'Alimentos', 
      stock: 30, 
      barcode: '77513000',
      hasVariants: true,
      variants: [
          { id: 'v1', name: 'Caja', price: 28.00, stock: 20 },
          { id: 'v2', name: 'Lata', price: 32.00, stock: 5 },
          { id: 'v3', name: 'Bolsa (Chocoton)', price: 29.50, stock: 5 }
      ]
  }
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