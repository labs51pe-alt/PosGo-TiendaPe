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
  { id: '1', name: 'Inca Kola 600ml', price: 3.50, category: 'Bebidas', stock: 45, barcode: '77501000', images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80'] },
  { id: '2', name: 'Coca Cola 600ml', price: 3.50, category: 'Bebidas', stock: 50, barcode: '77501001', images: ['https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'] },
  { id: '3', name: 'Agua San Mateo 1L', price: 2.50, category: 'Bebidas', stock: 24, barcode: '77502000', images: ['https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=400&q=80'] },
  { id: '4', name: 'Cerveza Pilsen 650ml', price: 7.00, category: 'Bebidas', stock: 120, barcode: '77503000', images: ['https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=400&q=80'] },
  { id: '5', name: 'Sporade Tropical', price: 2.80, category: 'Bebidas', stock: 15, barcode: '77504000', images: ['https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=400&q=80'] },
  
  // SNACKS
  { id: '6', name: 'Papas Lays Clásicas', price: 2.00, category: 'Snacks', stock: 30, barcode: '75010001', images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80'] },
  { id: '7', name: 'Doritos Queso', price: 2.20, category: 'Snacks', stock: 25, barcode: '75010002', images: ['https://images.unsplash.com/photo-1600952841320-db93a3821732?auto=format&fit=crop&w=400&q=80'] },
  { id: '8', name: 'Galleta Oreo Paquete', price: 1.50, category: 'Snacks', stock: 60, barcode: '76223000', images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80'] },
  { id: '9', name: 'Chocman', price: 1.20, category: 'Snacks', stock: 40, barcode: '77505000', images: ['https://images.unsplash.com/photo-1559181567-c3190cb9959b?auto=format&fit=crop&w=400&q=80'] },

  // ALIMENTOS
  { id: '10', name: 'Arroz Costeño 750g', price: 4.80, category: 'Alimentos', stock: 20, barcode: '77506000', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80'] },
  { id: '11', name: 'Aceite Primor 1L', price: 11.50, category: 'Alimentos', stock: 18, barcode: '77507000', images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80'] },
  { id: '12', name: 'Leche Gloria Azul', price: 4.20, category: 'Alimentos', stock: 36, barcode: '77508000', images: ['https://images.unsplash.com/photo-1563636619-e910fdf90597?auto=format&fit=crop&w=400&q=80'] },
  { id: '13', name: 'Atún Florida Filete', price: 6.50, category: 'Alimentos', stock: 50, barcode: '77509000', images: ['https://images.unsplash.com/photo-1599059021750-8471273894b6?auto=format&fit=crop&w=400&q=80'] },
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