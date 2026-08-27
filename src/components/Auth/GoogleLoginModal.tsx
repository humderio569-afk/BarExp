import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { Company } from '../../types';
import {
  ShieldCheck,
  Building2,
  Lock,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  AlertCircle,
  LogIn
} from 'lucide-react';

export const GoogleLoginModal: React.FC = () => {
  const {
    loginWithCompanyCodeAndGoogle,
    loginWithPin,
    loginWithGoogle,
    verifyCompanyCode
  } = useBar();

  // Mode: 'google' (Standard Direct Google Sign-In for all users & admins) vs 'code' (Join with bar code)
  const [activeMode, setActiveMode] = useState<'google' | 'code'>('google');

  // Multi-step staff flow states
  const [step, setStep] = useState<1 | 2>(1);
  const [companyCodeInput, setCompanyCodeInput] = useState('');
  const [verifiedCompany, setVerifiedCompany] = useState<Company | null>(null);
  const [pinCodeInput, setPinCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Verify 8-Character Company Code
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    const cleanCode = companyCodeInput.trim().toUpperCase();

    if (cleanCode.length !== 8) {
      setErrorMessage("Le code établissement doit comporter exactement 8 caractères.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      const company = await verifyCompanyCode(cleanCode);
      if (!company) {
        setErrorMessage(`Aucun établissement trouvé avec le code "${cleanCode}". Vérifiez le code fourni par votre responsable.`);
        setIsVerifyingCode(false);
        return;
      }

      if (company.status === 'suspended') {
        setErrorMessage("Cet établissement est temporairement suspendu. Veuillez contacter la direction.");
        setIsVerifyingCode(false);
        return;
      }

      setVerifiedCompany(company);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erreur lors de la vérification du code établissement.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Step 2A: Google Sign-in with Company Assignment
  const handleCompanyGoogleLogin = async () => {
    if (!verifiedCompany) return;
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await loginWithCompanyCodeAndGoogle(verifiedCompany.code);
      if (!res.success) {
        setErrorMessage(res.message || "Erreur de connexion Google.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("La fenêtre Google a été fermée ou bloquée.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Step 2B: Quick PIN Sign-in
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedCompany) return;
    const cleanPin = pinCodeInput.trim();
    if (cleanPin.length < 4 || cleanPin.length > 6) {
      setErrorMessage("Le code PIN doit comporter 4 à 6 chiffres.");
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await loginWithPin(verifiedCompany.code, cleanPin);
      if (!res.success) {
        setErrorMessage(res.message || "Code PIN incorrect pour cet établissement.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erreur lors de la connexion par PIN.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Standard Direct Google Sign-in for all accounts
  const handleDirectGoogleLogin = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Erreur d'authentification Google. Vérifiez que les fenêtres pop-up sont autorisées.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transition-all transform animate-in fade-in zoom-in duration-300">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 sm:p-7 text-white relative text-center">
          <div className="absolute top-3.5 right-3.5 bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-500/30">
            <ShieldCheck className="w-3 h-3" />
            Accès Sécurisé
          </div>

          {/* Logo / Monogram */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 p-1 shadow-lg shadow-amber-500/20 flex items-center justify-center mb-3">
            <span className="text-slate-950 font-black text-2xl tracking-tighter">BE</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">BarExpress</h2>
          <p className="text-slate-300 text-xs mt-0.5 font-medium">Système de Caisse & Gestion d'Établissement</p>

          {/* Mode Switcher Tabs */}
          <div className="mt-4 inline-flex p-1 bg-slate-950/60 rounded-xl border border-slate-700/60 text-xs font-bold w-full">
            <button
              type="button"
              onClick={() => {
                setActiveMode('google');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                activeMode === 'google'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Connexion Google
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('code');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                activeMode === 'code'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Code Établissement
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE 1: STANDARD DIRECT GOOGLE SIGN-IN */}
          {activeMode === 'google' && (
            <div className="space-y-4 py-1">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Bienvenue sur BarExpress</h3>
                <p className="text-xs text-slate-500">
                  Connectez-vous avec votre compte Google pour accéder à votre espace de gestion.
                </p>
              </div>

              {/* Standard Google Sign-In Button */}
              <button
                type="button"
                onClick={handleDirectGoogleLogin}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-bold px-5 py-3.5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm"
              >
                {isAuthenticating ? (
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continuer avec Google</span>
                  </>
                )}
              </button>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <p className="text-[11px] text-slate-500">
                  Vous êtes membre d'une équipe sur un terminal partagé ?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('code');
                    setErrorMessage(null);
                  }}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 underline mt-0.5 cursor-pointer"
                >
                  Entrer un code d'établissement ou code PIN
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: CODE & PIN AUTHENTICATION FLOW */}
          {activeMode === 'code' && (
            <div className="space-y-4">
              {/* STEP 1: Enter 8-Character Company Code */}
              {step === 1 && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-black text-slate-900">Saisie du Code Établissement</h3>
                    <p className="text-xs text-slate-500">
                      Entrez le code unique à 8 caractères fourni par votre responsable.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Code Établissement (8 caractères)</label>
                    <input
                      type="text"
                      maxLength={8}
                      autoFocus
                      required
                      placeholder="Ex: BAR12345"
                      value={companyCodeInput}
                      onChange={(e) => setCompanyCodeInput(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-amber-400 text-center font-mono font-black text-xl tracking-widest rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase placeholder:text-slate-600 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingCode || companyCodeInput.trim().length !== 8}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                  >
                    {isVerifyingCode ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Valider le Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Recognition Badge & Authentication Choice */}
              {step === 2 && verifiedCompany && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  {/* Recognized Company Badge */}
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-300 rounded-2xl text-center space-y-1 relative">
                    <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Établissement Reconnu
                    </div>

                    <h4 className="text-lg font-black text-slate-950">{verifiedCompany.name}</h4>
                    <p className="text-xs text-slate-600">
                      Gérant : <strong className="text-slate-900">{verifiedCompany.managerName}</strong>
                      {verifiedCompany.address ? ` • ${verifiedCompany.address}` : ''}
                    </p>

                    <div className="pt-2 flex items-center justify-center gap-3 text-xs font-mono font-bold text-amber-900">
                      <span>Code : {verifiedCompany.code}</span>
                      <span>•</span>
                      <span>Devise : {verifiedCompany.currency}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline mt-1 cursor-pointer"
                    >
                      Changer de code
                    </button>
                  </div>

                  {/* Auth Options */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleCompanyGoogleLogin}
                      disabled={isAuthenticating}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-bold px-4 py-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Se connecter avec Google</span>
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-400 uppercase">OU ACCÈS CODE PIN</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* PIN Form */}
                    <form onSubmit={handlePinLogin} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="Code PIN à 4-6 chiffres"
                          value={pinCodeInput}
                          onChange={(e) => setPinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="submit"
                          disabled={isAuthenticating || pinCodeInput.length < 4}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          Entrer PIN
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Si votre gérant vous a attribué un code PIN, saisissez-le pour un accès direct.
                      </p>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-400">
              Connexion sécurisée BarExpress &bull; Firebase Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
