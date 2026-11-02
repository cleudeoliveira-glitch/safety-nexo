import * as forge from 'node-forge';

export type CertificadoAberto = {
  chavePem: string;
  certificadoBase64: string; // DER em base64, para o X509Certificate da assinatura
  titular: string;
  documento: string;
  tipoDocumento: 'CNPJ' | 'CPF';
  validoDe: Date;
  validoAte: Date;
};

// OIDs da ICP-Brasil no subjectAltName (otherName): CNPJ do e-CNPJ e dados do titular do e-CPF.
const OID_CNPJ = '2.16.76.1.3.3';
const OID_PF = '2.16.76.1.3.1'; // nascimento (8) + CPF (11) + ...

function otherNames(cert: forge.pki.Certificate): Record<string, string> {
  const ext = cert.getExtension('subjectAltName') as { value?: string } | null;
  const achados: Record<string, string> = {};
  if (!ext?.value) return achados;
  try {
    const asn1 = forge.asn1.fromDer(ext.value);
    for (const nome of asn1.value as forge.asn1.Asn1[]) {
      if (nome.type !== 0) continue; // otherName
      const [oid, valor] = nome.value as forge.asn1.Asn1[];
      const id = forge.asn1.derToOid(oid.value as string);
      let v: forge.asn1.Asn1 = valor;
      while (Array.isArray(v.value)) v = (v.value as forge.asn1.Asn1[])[0];
      achados[id] = String(v.value ?? '');
    }
  } catch {
    /* extensão fora do padrão: cai no CN */
  }
  return achados;
}

export function abrirCertificado(pfx: Buffer, senha: string): CertificadoAberto {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(pfx.toString('binary')), senha);
  } catch {
    throw new Error('Não foi possível abrir o certificado. Confira se o arquivo é .pfx ou .p12 e se a senha está certa.');
  }
  const chaves = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
  ];
  const chave = chaves.find((b) => b.key)?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!chave) throw new Error('O arquivo não contém a chave privada do certificado.');
  // O certificado do titular é o que corresponde à chave (os outros são da cadeia).
  const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []).map((b) => b.cert!).filter(Boolean);
  const cert = certs.find((c) => (c.publicKey as forge.pki.rsa.PublicKey).n.equals(chave.n)) ?? certs[0];
  if (!cert) throw new Error('O arquivo não contém o certificado.');

  const cn = String(cert.subject.getField('CN')?.value ?? '');
  const outros = otherNames(cert);
  let documento = (outros[OID_CNPJ] ?? '').replace(/\D/g, '');
  let tipoDocumento: 'CNPJ' | 'CPF' = 'CNPJ';
  if (documento.length !== 14) {
    const pf = (outros[OID_PF] ?? '').replace(/\D/g, '');
    if (pf.length >= 19) { documento = pf.slice(8, 19); tipoDocumento = 'CPF'; }
    else {
      const doCn = (cn.split(':').pop() ?? '').replace(/\D/g, '');
      if (doCn.length === 14 || doCn.length === 11) { documento = doCn; tipoDocumento = doCn.length === 14 ? 'CNPJ' : 'CPF'; }
    }
  }
  if (documento.length !== 14 && documento.length !== 11) throw new Error('Não encontrei o CNPJ ou o CPF no certificado. Ele precisa ser e-CNPJ ou e-CPF da ICP-Brasil.');

  return {
    chavePem: forge.pki.privateKeyToPem(chave),
    certificadoBase64: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()),
    titular: cn.split(':')[0] || cn,
    documento,
    tipoDocumento,
    validoDe: cert.validity.notBefore,
    validoAte: cert.validity.notAfter,
  };
}
