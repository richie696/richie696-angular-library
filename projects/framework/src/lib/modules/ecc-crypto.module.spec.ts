import {EccCryptoModule} from './ecc-crypto.module'

describe('EccCryptoModule', () => {
  it('derives an AES-GCM key that round-trips between two peers', async () => {
    const client = new EccCryptoModule()
    const gateway = new EccCryptoModule()
    const clientPair = await client.generateKeyPair()
    const gatewayPair = await gateway.generateKeyPair()
    const clientPublic = await client.exportPublicKey(clientPair.publicKey)
    const gatewayPublic = await gateway.exportPublicKey(gatewayPair.publicKey)

    await client.generateSharedKey(await client.importPublicKey(gatewayPublic))
    await gateway.generateSharedKey(await gateway.importPublicKey(clientPublic))

    const encrypted = await client.encrypt('gateway-v1-payload')
    expect(await gateway.decrypt(encrypted)).toBe('gateway-v1-payload')
    expect(() => gateway.decrypt('AQID')).toThrowError(/密文格式无效/)
  })
})
