Pod::Spec.new do |s|
  s.name           = 'BiometricSigner'
  s.version        = '0.1.0'
  s.summary        = 'Secure Enclave, biometric-gated P-256 signing for the StockKart Attendance app'
  s.description    = <<-DESC
    Local Expo Module of apps/attendance. Creates two P-256 key pairs in the Secure Enclave: a punch
    key that signs only after Face ID / Touch ID (access control .biometryCurrentSet, no passcode
    fallback, one check per signature) and a device key that signs request envelopes without a
    prompt. Signatures are DER ECDSA-Sig-Value over SHA-256; public keys are DER SubjectPublicKeyInfo.
  DESC
  s.author         = 'StockKart'
  s.homepage       = 'https://stockkart.in'
  s.license        = { :type => 'UNLICENSED', :text => 'Proprietary. Part of the StockKart inventory-platform repository.' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Security.framework for the Secure Enclave keys and ECDSA; LocalAuthentication for the
  # LAContext that carries the biometric check into SecKeyCreateSignature.
  s.frameworks = 'Security', 'LocalAuthentication'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
