import { SignedXml } from 'xml-crypto';

// Assinatura do evento conforme o Manual de Orientação ao Desenvolvedor do eSocial (v1.16):
// enveloped, RSA-SHA256, digest SHA-256, C14N, Reference URI="" e KeyInfo só com o X509Certificate.
export function assinarEvento(xml: string, chavePem: string, certificadoBase64: string): string {
  const sig = new SignedXml({
    privateKey: chavePem,
    publicCert: certificadoBase64,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    getKeyInfoContent: () => `<X509Data><X509Certificate>${certificadoBase64}</X509Certificate></X509Data>`,
  });
  sig.addReference({
    xpath: '/*',
    uri: '',
    isEmptyUri: true,
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'],
  });
  sig.computeSignature(xml, { location: { reference: '/*', action: 'append' } });
  return sig.getSignedXml();
}
