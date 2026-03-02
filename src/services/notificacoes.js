import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**

HubOquei - Serviço de Notificações Ativas

Este serviço integra com a coleção 'mail' do Firebase (extensão Trigger Email)

ou prepara o payload para uma API externa de e-mail.
*/

export const sendRHNotification = async (type, data) => {
const rhEmail = "rh@oquei.net.br";

let subject = "";
let htmlContent = "";

if (type === 'falta_confirmada') {
subject = [ALERTA RH] Falta Confirmada - ${data.employeeName};
htmlContent = <div style="font-family: sans-serif; line-height: 1.6; color: #333;"> <h2 style="color: #2563eb;">Confirmação de Ausência</h2> <p>Uma nova falta foi validada pelo Supervisor no sistema <strong>HubOquei</strong>.</p> <hr /> <p><strong>Colaborador:</strong> ${data.employeeName}</p> <p><strong>Loja/Cidade:</strong> ${data.storeName}</p> <p><strong>Período:</strong> ${data.startDate} até ${data.endDate}</p> <p><strong>Motivo:</strong> ${data.reason}</p> <p><strong>Supervisor Responsável:</strong> ${data.supervisorName}</p> <br /> <p style="font-size: 12px; color: #64748b;">Enviado automaticamente pelo Ecossistema Oquei Telecom.</p> </div>;
}

if (type === 'atestado_recebido') {
subject = [URGENTE RH] Novo Atestado Anexado - ${data.employeeName};
htmlContent = <div style="font-family: sans-serif; line-height: 1.6; color: #333;"> <h2 style="color: #059669;">Novo Atestado Médico</h2> <p>Um comprovante de saúde foi anexado para o colaborador abaixo.</p> <hr /> <p><strong>Colaborador:</strong> ${data.employeeName}</p> <p><strong>CID/Motivo:</strong> ${data.cid || 'Não informado'}</p> <p><strong>Dias de Afastamento:</strong> ${data.days} dia(s)</p> <p><strong>Data de Emissão:</strong> ${data.issueDate}</p> <br /> <p>Acesse o painel administrativo para visualizar o documento original.</p> <p style="font-size: 12px; color: #64748b;">Enviado automaticamente pelo Ecossistema Oquei Telecom.</p> </div>;
}

try {
// Se estiver a usar a extensão "Trigger Email" do Firebase:
await addDoc(collection(db, "mail"), {
to: rhEmail,
message: {
subject: subject,
html: htmlContent,
},
createdAt: serverTimestamp()
});
console.log("Notificação enviada ao RH com sucesso.");
return true;
} catch (error) {
console.error("Erro ao disparar e-mail para o RH:", error);
return false;
}
};