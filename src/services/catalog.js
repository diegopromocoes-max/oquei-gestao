import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// ─── LEITURA (READ) ───
export const getCities = async () => {
  const snap = await getDocs(query(collection(db, "cities"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getCategories = async () => {
  const snap = await getDocs(query(collection(db, "product_categories"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getProducts = async (onlyActive = true) => {
  let q = collection(db, "products");
  if (onlyActive) {
    q = query(q, where("active", "==", true));
  }
  const snap = await getDocs(q);
  // Ordenação feita localmente para evitar a necessidade de criar índices complexos no Firebase
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name));
};

// ─── ESCRITA: CATEGORIAS ───
export const saveCategory = async (id, data) => {
  if (id) return updateDoc(doc(db, "product_categories", id), data);
  return addDoc(collection(db, "product_categories"), data);
};

export const deleteCategory = async (id) => {
  return deleteDoc(doc(db, "product_categories", id));
};

export const countProductsInCategory = async (categoryId) => {
  const snap = await getDocs(query(collection(db, "products"), where("categoryId", "==", categoryId)));
  return snap.size;
};

// ─── ESCRITA: PRODUTOS ───
export const saveProduct = async (id, data) => {
  if (id) return updateDoc(doc(db, "products", id), data);
  return addDoc(collection(db, "products"), data);
};

export const deleteProduct = async (id) => {
  return deleteDoc(doc(db, "products", id));
};

export const toggleProductStatus = async (id, currentStatus) => {
  return updateDoc(doc(db, "products", id), { active: !currentStatus });
};

export const countLeadsWithProduct = async (productId) => {
  const snap = await getDocs(query(collection(db, "leads"), where("productId", "==", productId)));
  return snap.size;
};
