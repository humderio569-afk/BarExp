import React, { useState } from 'react';
import { useBar } from '../../context/BarContext';
import { ManualPaymentProof, ManualPaymentMethod } from '../../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Phone,
  Edit2,
  Save,
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  CreditCard,
  Camera,
  Calendar,
  Check,
  MessageSquare
} from 'lucide-react';

export const ManualPaymentProofsView: React.FC = () => {
  const {
    manualPaymentProofs,
    manualPaymentMethods,
    approveManualPaymentProof,
    disapproveManualPaymentProof,
    updateManualPaymentMethod,
    companies,
  } = useBar();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'disapproved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected proof for Fullscreen / Zoom Photo Review Modal
  const [selectedProofForPhoto, setSelectedProofForPhoto] = useState<ManualPaymentProof | null>(null);

  // Disapproval prompt state
  const [disapprovingProof, setDisapprovingProof] = useState<ManualPaymentProof | null>(null);
  const [disapprovalReasonInput, setDisapprovalReasonInput] = useState('');
  const [disapprovalError, setDisapprovalError] = useState<string | null>(null);

  // Payment Methods Settings Edit Modal / Panel
  const [editingMethod, setEditingMethod] = useState<ManualPaymentMethod | null>(null);
  const [editMethodName, setEditMethodName] = useState('');
  const [editMethodNumber, setEditMethodNumber] = useState('');
  const [editMethodAccountName, setEditMethodAccountName] = useState('');
  const [editMethodInstructions, setEditMethodInstructions] = useState('');

  // Success toast state
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const pendingCount = manualPaymentProofs.filter(p => p.status === 'pending').length;
  const approvedCount = manualPaymentProofs.filter(p => p.status === 'approved').length;
  const disapprovedCount = manualPaymentProofs.filter(p => p.status === 'disapproved').length;

  const filteredProofs = manualPaymentProofs.filter(proof => {
    const matchStatus = statusFilter === 'all' || proof.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      proof.companyName.toLowerCase().includes(q) ||
      proof.companyCode.toLowerCase().includes(q) ||
      proof.adminEmail.toLowerCase().includes(q) ||
      proof.transactionReference.toLowerCase().includes(q) ||
      proof.paymentMethodName.toLowerCase().includes(q);

    return matchStatus && matchQuery;
  });

  const handleApprove = async (proof: ManualPaymentProof) => {
    await approveManualPaymentProof(proof.id);
    showToast(`Paiement de ${proof.amount} ${proof.currency} pour ${proof.companyName} (${proof.companyCode}) validé avec succès !`);
    if (selectedProofForPhoto?.id === proof.id) {
      setSelectedProofForPhoto(null);
    }
  };

  const handleOpenDisapproveModal = (proof: ManualPaymentProof) => {
    setDisapprovingProof(proof);
    setDisapprovalReasonInput('');
    setDisapprovalError(null);
  };

  const handleConfirmDisapprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disapprovingProof) return;

    if (!disapprovalReasonInput.trim()) {
      setDisapprovalError("Veuillez indiquer obligatoirement le motif du rejet (ex: référence introuvable, reçu illisible, montant incorrect).");
      return;
    }

    await disapproveManualPaymentProof(disapprovingProof.id, disapprovalReasonInput.trim());
    showToast(`Paiement de ${disapprovingProof.companyName} désapprouvé. Le client a été notifié.`);
    setDisapprovingProof(null);
    if (selectedProofForPhoto?.id === disapprovingProof.id) {
      setSelectedProofForPhoto(null);
    }
  };

  const handleOpenEditMethod = (method: ManualPaymentMethod) => {
    setEditingMethod(method);
    setEditMethodName(method.name);
    setEditMethodNumber(method.accountNumber);
    setEditMethodAccountName(method.accountName);
    setEditMethodInstructions(method.instructions);
  };

  const handleSaveMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    updateManualPaymentMethod(editingMethod.id, {
      name: editMethodName.trim() || editingMethod.name,
      accountNumber: editMethodNumber.trim() || editingMethod.accountNumber,
      accountName: editMethodAccountName.trim() || editingMethod.accountName,
      instructions: editMethodInstructions.trim() || editingMethod.instructions,
    });

    showToast(`Paramètres de paiement ${editingMethod.name} mis à jour avec succès.`);
    setEditingMethod(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button type="button" onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-black text-slate-900">
              Contrôle & Validation des Preuves MonCash / NatCash
            </h3>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded-full animate-bounce">
                {pendingCount} en attente
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Seul le Super Administrateur peut approuver ou désapprouver les photos de reçus envoyées par les établissements.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">À valider</span>
            <span className="text-base font-black text-amber-950">{pendingCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Validés</span>
            <span className="text-base font-black text-emerald-950">{approvedCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-red-800 uppercase block">Rejetés</span>
            <span className="text-base font-black text-red-950">{disapprovedCount}</span>
          </div>
        </div>
      </div>

      {/* Manual Payment Methods Config (MonCash / NatCash Accounts) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Coordonnées de Réception des Paiements (Visibles par les clients)
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">MonCash & NatCash Haïti</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {manualPaymentMethods.map(method => (
            <div key={method.id} className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{method.name}</span>
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold rounded">
                    {method.accountNumber}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Titulaire : <strong className="text-white">{method.accountName}</strong>
                </p>
                <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                  {method.instructions}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEditMethod(method)}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-amber-400 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ml-2"
                title="Modifier les coordonnées"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({manualPaymentProofs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En Attente ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white font-black'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validés ({approvedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('disapproved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'disapproved'
                ? 'bg-red-600 text-white font-black'
                : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejetés ({disapprovedCount})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher établissement, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Proofs List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredProofs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Camera className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">Aucune preuve de paiement trouvée</p>
            <p className="text-xs">Les preuves soumises par les gérants d'établissements apparaîtront ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Établissement & Contact</th>
                  <th className="p-3.5">Moyen & Référence</th>
                  <th className="p-3.5">Formule & Montant</th>
                  <th className="p-3.5">Preuve Photo</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Actions Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProofs.map((proof) => {
                  const isPending = proof.status === 'pending';
                  const isApproved = proof.status === 'approved';
                  const isDisapproved = proof.status === 'disapproved';

                  return (
                    <tr key={proof.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Company Info */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-sm">{proof.companyName}</span>
                            <span className="px-1.5 py-0.2 bg-slate-900 text-amber-400 text-[10px] font-mono font-bold rounded">
                              {proof.companyCode}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">{proof.adminEmail}</p>
                          <p className="text-slate-400 text-[10px] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(proof.submittedAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </td>

                      {/* Payment Method & Reference */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[11px] inline-block">
                            {proof.paymentMethodName}
                          </span>
                          <p className="font-mono font-bold text-slate-900 text-xs">
                            Réf: <span className="text-amber-700">{proof.transactionReference}</span>
                          </p>
                        </div>
                      </td>

                      {/* Plan & Amount */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            proof.planType === 'annual'
                              ? 'bg-amber-100 text-amber-900'
                              : (proof.planType === 'lifetime' ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900')
                          }`}>
                            {proof.planType === 'annual' ? 'Plan Annuel' : (proof.planType === 'lifetime' ? 'Plan À Vie' : 'Plan Mensuel')}
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            {proof.amount} {proof.currency}
                          </p>
                        </div>
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProofForPhoto(proof)}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 hover:border-amber-500 transition cursor-pointer block"
                          title="Cliquer pour voir la preuve en grand"
                        >
                          <img
                            src={proof.proofPhotoUrl}
                            alt="Reçu de paiement"
                            className="w-16 h-12 object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {isPending && (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[11px] font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>En attente de validation</span>
                          </div>
                        )}
                        {isApproved && (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Validé</span>
                            </div>
                            {proof.reviewedAt && (
                              <p className="text-[10px] text-slate-400">
                                {new Date(proof.reviewedAt).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        )}
                        {isDisapproved && (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-800 rounded-full text-[11px] font-bold">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>Désapprouvé</span>
                            </div>
                            {proof.disapprovalReason && (
                              <p className="text-[10px] text-red-700 italic max-w-xs line-clamp-2">
                                "{proof.disapprovalReason}"
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProofForPhoto(proof)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="Examiner la photo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(proof)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Valider</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDisapproveModal(proof)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Désapprouver</span>
                              </button>
                            </>
                          )}

                          {!isPending && (
                            <button
                              type="button"
                              onClick={() => isApproved ? handleOpenDisapproveModal(proof) : handleApprove(proof)}
                              className="text-[11px] text-slate-500 hover:text-slate-900 underline font-medium cursor-pointer"
                            >
                              {isApproved ? 'Révoquer' : 'Re-valider'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULLSCREEN / ZOOM PHOTO REVIEW MODAL */}
      {selectedProofForPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-black text-white">
                    Preuve de Paiement &bull; {selectedProofForPhoto.companyName} ({selectedProofForPhoto.companyCode})
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Réf : <span className="font-mono text-amber-300 font-bold">{selectedProofForPhoto.transactionReference}</span> &bull; {selectedProofForPhoto.amount} {selectedProofForPhoto.currency} via {selectedProofForPhoto.paymentMethodName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofForPhoto(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Container */}
            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-[300px] max-h-[55vh]">
              <img
                src={selectedProofForPhoto.proofPhotoUrl}
                alt="Preuve complète de paiement"
                className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-600">
                Statut actuel : <strong className="text-slate-900 uppercase">{selectedProofForPhoto.status}</strong>
                {selectedProofForPhoto.disapprovalReason && (
                  <span className="text-red-600 block text-[11px] italic">
                    Motif : {selectedProofForPhoto.disapprovalReason}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProofForPhoto(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDisapproveModal(selectedProofForPhoto)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-black rounded-xl cursor-pointer"
                >
                  Désapprouver
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(selectedProofForPhoto)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider & Activer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISAPPROVAL PROMPT MODAL WITH MANDATORY REASON */}
      {disapprovingProof && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-red-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <h4 className="text-sm font-black text-white">Désapprouver la Preuve de Paiement</h4>
              </div>
              <button
                type="button"
                onClick={() => setDisapprovingProof(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDisapprove} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
                <p className="font-bold">
                  Établissement : {disapprovingProof.companyName} ({disapprovingProof.companyCode})
                </p>
                <p className="text-[11px] text-red-800">
                  L'administrateur recevra ce message sur son écran et devra refaire le paiement ou contacter le service client.
                </p>
              </div>

              {disapprovalError && (
                <div className="p-2.5 bg-red-100 text-red-800 rounded-xl font-bold">
                  {disapprovalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Motif du Rejet (Obligatoire) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  placeholder="Ex: Le numéro de transaction MC9928 est introuvable sur notre compte MonCash. Veuillez vérifier ou renvoyer un SMS valide."
                  value={disapprovalReasonInput}
                  onChange={(e) => setDisapprovalReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisapprovingProof(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Confirmer le Rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT METHOD MODAL */}
      {editingMethod && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white">Modifier Compte {editingMethod.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingMethod(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom du Moyen de Paiement</label>
                <input
                  type="text"
                  required
                  value={editMethodName}
                  onChange={(e) => setEditMethodName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro de Téléphone / Compte</label>
                <input
                  type="text"
                  required
                  placeholder="+509 3700-0000"
                  value={editMethodNumber}
                  onChange={(e) => setEditMethodNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom du Titulaire du Compte</label>
                <input
                  type="text"
                  required
                  value={editMethodAccountName}
                  onChange={(e) => setEditMethodAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Consignes affichées au client</label>
                <textarea
                  rows={2}
                  required
                  value={editMethodInstructions}
                  onChange={(e) => setEditMethodInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
