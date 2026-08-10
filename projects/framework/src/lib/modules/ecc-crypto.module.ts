/**
 * ECC 加密模块：负责 ECDH 密钥交换、共享密钥派生与 AES-GCM 加解密。
 */
export class EccCryptoModule {
  /** ECDH 曲线算法配置 */
  private readonly algorithm: EcKeyGenParams = {
    name: 'ECDH',
    namedCurve: 'P-256'
  }
  /** 客户端本地密钥对 */
  private keyPair: CryptoKeyPair | null = null
  /** 与网关派生后的共享对称密钥 */
  private sharedKey: CryptoKey | null = null
  /** 网关公钥缓存 */
  private gatewayPublicKey: CryptoKey | null = null
  /** 网关密钥标识 */
  public gatewayKeyId: string | null = null

  /**
   * 生成本地 ECDH 密钥对。
   */
  async generateKeyPair(): Promise<CryptoKeyPair> {
    // 生成可导出的公钥与可用于派生的私钥
    this.keyPair = await this.crypto().subtle.generateKey(
      this.algorithm,
      false,
      ['deriveKey', 'deriveBits']
    )
    return this.keyPair
  }

  /**
   * 导出公钥并编码为 Base64 字符串，便于通过请求头传输。
   * @param publicKey 待导出的公钥
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await this.crypto().subtle.exportKey('spki', publicKey)
    return this.toBase64(new Uint8Array(exported))
  }

  /**
   * 将 Base64 格式的网关公钥导入为 CryptoKey。
   * @param base64PublicKey 网关公钥（Base64 编码）
   */
  async importPublicKey(base64PublicKey: string): Promise<CryptoKey> {
    const bytes = this.fromBase64(base64PublicKey)
    const keyBytes = bytes.slice().buffer as ArrayBuffer
    return await this.crypto().subtle.importKey('spki', keyBytes, this.algorithm, false, [])
  }

  /**
   * 使用本地私钥与远端公钥派生共享密钥。
   * @param remotePublicKey 远端（网关）公钥
   */
  async generateSharedKey(remotePublicKey: CryptoKey): Promise<CryptoKey> {
    if (!this.keyPair) throw new Error('本地密钥对未生成')
    // ECDH 派生得到 AES-GCM 共享密钥
    this.sharedKey = await this.crypto().subtle.deriveKey(
      { name: 'ECDH', public: remotePublicKey },
      this.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
    return this.sharedKey
  }

  /**
   * 使用共享密钥加密字符串，返回 Base64(IV + 密文)。
   * @param data 明文字符串
   */
  async encrypt(data: string): Promise<string> {
    if (!this.sharedKey) throw new Error('共享密钥未初始化')
    // 每次加密都生成随机 IV，避免重放与密文模式泄露
    const iv = this.crypto().getRandomValues(new Uint8Array(12))
    const encodedData = new TextEncoder().encode(data)
    const encryptedData = await this.crypto().subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.sharedKey,
      encodedData
    )
    const combined = new Uint8Array(iv.length + encryptedData.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encryptedData), iv.length)
    return this.toBase64(combined)
  }

  /**
   * 解密 Base64(IV + 密文) 数据并返回明文。
   * @param encryptedData Base64 编码密文
   */
  async decrypt(encryptedData: string): Promise<string> {
    if (!this.sharedKey) throw new Error('共享密钥未初始化')
    // 按约定前 12 字节为 IV，后续字节为密文
    const combined = this.fromBase64(encryptedData)
    if (combined.length < 12 + 16) throw new Error('密文格式无效：IV 或认证标签缺失')
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decryptedData = await this.crypto().subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.sharedKey,
      data
    )
    return new TextDecoder().decode(decryptedData)
  }

  /**
   * 与网关执行首次密钥交换，建立共享密钥。
   * @param baseUrl 网关基地址
   * @param clientId 客户端标识
   */
  async exchangeKeys(
    baseUrl: string,
    clientId: string,
    exchangePath = '/api/crypto/exchange',
    protocolVersion = '1'
  ): Promise<boolean> {
    // 先生成本地密钥，再把公钥发送给网关换取网关公钥
    await this.generateKeyPair()
    const clientPublicKey = await this.exportPublicKey(this.keyPair!.publicKey)
    const endpoint = /^https?:\/\//i.test(exchangePath)
      ? exchangePath
      : `${baseUrl.replace(/\/$/, '')}${exchangePath.startsWith('/') ? exchangePath : `/${exchangePath}`}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Public-Key': clientPublicKey,
        'X-Client-Id': clientId,
        'X-Gateway-Protocol-Version': protocolVersion
      }
    })
    if (!response.ok) throw new Error(`密钥交换失败: ${response.status}`)
    const result: unknown = await response.json()
    if (!result || typeof result !== 'object') throw new Error('密钥交换响应格式无效')
    const record = result as Record<string, unknown>
    if (typeof record['keyId'] !== 'string' || typeof record['gatewayPublicKey'] !== 'string') {
      throw new Error('密钥交换响应缺少 keyId 或 gatewayPublicKey')
    }
    // 缓存网关 keyId + 公钥并派生共享密钥
    this.gatewayKeyId = record['keyId']
    this.gatewayPublicKey = await this.importPublicKey(record['gatewayPublicKey'])
    await this.generateSharedKey(this.gatewayPublicKey)
    return true
  }

  /**
   * 按网关下发的新密钥信息重新握手。
   * @param keyId 新网关密钥标识
   * @param gatewayPublicKey 新网关公钥（Base64）
   */
  async reHandshake(keyId: string, gatewayPublicKey: string): Promise<void> {
    this.gatewayKeyId = keyId
    this.gatewayPublicKey = await this.importPublicKey(gatewayPublicKey)
    await this.generateSharedKey(this.gatewayPublicKey)
  }

  /**
   * 判断加密上下文是否已准备完成。
   */
  isInitialized(): boolean {
    return this.sharedKey !== null && this.gatewayKeyId !== null
  }

  /**
   * 释放密钥相关内存状态。
   */
  cleanup(): void {
    this.keyPair = null
    this.sharedKey = null
    this.gatewayPublicKey = null
    this.gatewayKeyId = null
  }

  private crypto(): Crypto {
    const cryptoApi = globalThis.crypto
    if (!cryptoApi?.subtle) throw new Error('当前运行环境不支持 Web Crypto API')
    return cryptoApi
  }

  private toBase64(bytes: Uint8Array): string {
    if (typeof btoa === 'function') return btoa(String.fromCharCode(...bytes))
    throw new Error('当前运行环境不支持 Base64 编码')
  }

  private fromBase64(value: string): Uint8Array {
    try {
      if (typeof atob !== 'function') throw new Error('当前运行环境不支持 Base64 解码')
      const binary = atob(value)
      return Uint8Array.from(binary, (char) => char.charCodeAt(0))
    } catch (cause) {
      throw new Error('密文或公钥不是有效 Base64', {cause})
    }
  }
}
