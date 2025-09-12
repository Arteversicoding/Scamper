import { db, storage, auth } from './firebase-init.js';
import {
	collection,
	addDoc,
	updateDoc,
	deleteDoc,
	doc,
	serverTimestamp,
	onSnapshot,
	query,
	orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
	ref as storageRef,
	uploadBytes,
	getDownloadURL,
	deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const MATERIALS_COLLECTION = 'materials';

export function listenMaterialsRealtime(callback) {
	const q = query(collection(db, MATERIALS_COLLECTION), orderBy('createdAt', 'desc'));
	return onSnapshot(q, (snapshot) => {
		const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
		callback(items);
	});
}

export async function createMaterial({ title, description, file, linkUrl }) {
	if (!auth.currentUser) throw new Error('Unauthorized');
	let fileUrl = '';
	let filePath = '';
	if (file) {
		filePath = `materials/${auth.currentUser.uid}/${Date.now()}-${file.name}`;
		const ref = storageRef(storage, filePath);
		await uploadBytes(ref, file);
		fileUrl = await getDownloadURL(ref);
	}
	return await addDoc(collection(db, MATERIALS_COLLECTION), {
		title,
		description,
		fileUrl,
		linkUrl: linkUrl || '',
		filePath,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
		ownerId: auth.currentUser.uid
	});
}

export async function updateMaterial(id, { title, description, newFile, linkUrl }) {
	const materialRef = doc(db, MATERIALS_COLLECTION, id);
	let updates = { updatedAt: serverTimestamp() };
	if (typeof title === 'string') updates.title = title;
	if (typeof description === 'string') updates.description = description;
	if (typeof linkUrl === 'string') updates.linkUrl = linkUrl;
	if (newFile) {
		// Upload new file and replace
		const newPath = `materials/${auth.currentUser?.uid || 'anonymous'}/${Date.now()}-${newFile.name}`;
		const refNew = storageRef(storage, newPath);
		await uploadBytes(refNew, newFile);
		updates.fileUrl = await getDownloadURL(refNew);
		updates.filePath = newPath;
	}
	await updateDoc(materialRef, updates);
}

export async function deleteMaterial(id, filePath) {
	await deleteDoc(doc(db, MATERIALS_COLLECTION, id));
	if (filePath) {
		try {
			await deleteObject(storageRef(storage, filePath));
		} catch (e) {
			console.warn('Failed to delete file from storage:', e);
		}
	}
}


