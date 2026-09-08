"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PhotoCaptureInput } from "@/components/ui/PhotoCaptureInput";
import { LocationPicker, MAPUTO_DEFAULT } from "@/components/customer/LocationPicker";
import { useDeviceLocationDefault } from "@/lib/geo/useDeviceLocationDefault";
import { uploadAndConfirm } from "@/lib/stores/upload";
import { presignUserPhoto, confirmUserPhoto, updateProfile, ClientApiError } from "@/lib/auth/client";
import {
  getCourierProfile,
  saveCourierProfile,
  listCourierDocuments,
  presignCourierDocument,
  createCourierDocument,
  deleteCourierDocument,
} from "@/lib/courier/client";
import {
  TRANSPORT_LABELS,
  PLATE_REQUIRED_TRANSPORTS,
  DOCUMENT_TYPE_LABELS,
  type TransportType,
  type CourierDocumentType,
  type CourierDocument,
} from "@/lib/courier/types";
import type { UserProfile } from "@/lib/auth/types";

const TRANSPORT_OPTIONS: TransportType[] = ["WALK", "BICYCLE", "MOTORCYCLE", "EBIKE", "CAR"];
const DOCUMENT_TYPE_OPTIONS: CourierDocumentType[] = ["BI", "CARTA_CONDUCAO", "PASSAPORTE"];

export function CourierOnboardingForm({ user, pendingApproval }: { user: UserProfile; pendingApproval?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const hasRegisteredLocation = user.latitude != null && user.longitude != null;
  const [position, setPosition] = useState<[number, number]>(
    hasRegisteredLocation ? [user.latitude!, user.longitude!] : MAPUTO_DEFAULT,
  );
  const [hasSavedLocation, setHasSavedLocation] = useState(hasRegisteredLocation);
  useDeviceLocationDefault(hasSavedLocation, (lat, lng) => setPosition([lat, lng]));

  const [transportType, setTransportType] = useState<TransportType>("WALK");
  const [plateNumber, setPlateNumber] = useState("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<CourierDocument[]>([]);
  const [docType, setDocType] = useState<CourierDocumentType>("BI");
  const [docNumber, setDocNumber] = useState("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docIssuePlace, setDocIssuePlace] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setServiceUnavailable(false);
    try {
      const profile = await getCourierProfile();
      setPosition([profile.baseLatitude, profile.baseLongitude]);
      setHasSavedLocation(true);
      setTransportType(profile.transportType);
      setPlateNumber(profile.plateNumber ?? "");
    } catch (err) {
      if (!(err instanceof ClientApiError) || err.code !== "COURIER_PROFILE_NOT_FOUND") {
        // Any failure other than "profile doesn't exist yet" (including the
        // proposed backend simply not existing yet) — still let the person
        // fill in the form; only the final save will actually fail.
        setServiceUnavailable(true);
      }
    }
    try {
      const docs = await listCourierDocuments();
      setDocuments(docs);
    } catch {
      // Tolerated — the documents section just starts empty.
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const handlePhotoSelected = async (file: File) => {
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const { url } = await uploadAndConfirm(file, (contentType) => presignUserPhoto(contentType), (key) => confirmUserPhoto(key));
      await updateProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? "",
        address: user.address ?? "",
        city: "Maputo",
        neighborhood: user.neighborhood ?? "",
        photoUrl: url,
      });
      setPhotoUrl(url);
    } catch (err) {
      setPhotoError(err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível enviar a foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    setDocError(null);
    setBusyDocId(documentId);
    try {
      await deleteCourierDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      setDocError(err instanceof ClientApiError ? err.message : "Não foi possível remover o documento.");
    } finally {
      setBusyDocId(null);
    }
  };

  const plateRequired = PLATE_REQUIRED_TRANSPORTS.includes(transportType);
  const hasLicence = documents.some((d) => d.type === "CARTA_CONDUCAO") || (docType === "CARTA_CONDUCAO" && docFile != null);

  const handleSubmit = async () => {
    setSaveError(null);
    setDocError(null);
    setSaved(false);
    if (plateRequired && !plateNumber.trim()) {
      setSaveError("Indique a matrícula do veículo.");
      return;
    }
    if (plateRequired && !hasLicence) {
      setSaveError(
        "Para Mota ou Carro é obrigatório ter a Carta de Condução carregada — preencha os campos do documento abaixo antes de guardar.",
      );
      return;
    }
    // The document fields are optional, but if any of them was touched,
    // all of them (including the file) are required — no half-filled
    // document gets silently dropped or silently created.
    const docTouched = docFile != null || docNumber.trim() || docIssueDate || docExpiryDate || docIssuePlace.trim();
    if (docTouched && (!docFile || !docNumber.trim() || !docIssueDate || !docExpiryDate || !docIssuePlace.trim())) {
      setSaveError("Preencha todos os campos do documento (ou limpe-os todos para guardar sem adicionar um novo).");
      return;
    }
    setSaving(true);
    try {
      await saveCourierProfile({
        baseLatitude: position[0],
        baseLongitude: position[1],
        transportType,
        plateNumber: plateRequired ? plateNumber.trim() : null,
      });
      if (docTouched && docFile) {
        const created = await uploadAndConfirm(
          docFile,
          (contentType) => presignCourierDocument(contentType),
          (fileKey) =>
            createCourierDocument({
              type: docType,
              number: docNumber.trim(),
              issueDate: docIssueDate,
              expiryDate: docExpiryDate,
              issuePlace: docIssuePlace.trim(),
              fileKey,
            }),
        );
        setDocuments((prev) => [...prev, created]);
        setDocNumber("");
        setDocIssueDate("");
        setDocExpiryDate("");
        setDocIssuePlace("");
        setDocFile(null);
        if (docFileInputRef.current) docFileInputRef.current.value = "";
      }
      setSaved(true);
      // A pending applicant can't do anything past this yet (store
      // association requires the actual COURIER role, granted only once
      // admin approves) — stay here and show the wait-for-approval message
      // instead of navigating to a screen that would just bounce them back.
      if (!pendingApproval) {
        router.push("/courier/stores");
      }
    } catch (err) {
      setSaveError(err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível guardar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">A carregar…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Concluir perfil de entregador</h1>
        <p className="mt-1 text-sm text-muted">
          {!pendingApproval ? "Estes dados são necessários antes de se poder associar a lojas e receber encomendas." : null}
        </p>
      </div>

      {pendingApproval ? (
        <p className="rounded-xl border border-brand-orange/40 bg-brand-orange/10 p-3 text-sm text-brand-orange">
          O seu pedido para se tornar Entregador está pendente de aprovação. Pode continuar a usar a conta como
          Cliente enquanto aguarda — complete o perfil abaixo para agilizar a aprovação.
        </p>
      ) : null}

      {serviceUnavailable ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          Não foi possível carregar um perfil existente — pode continuar a preencher, mas guardar pode falhar até o
          serviço estar disponível.
        </p>
      ) : null}

      {/* Photo */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Foto de perfil</h2>
        {photoError ? <p className="text-center text-sm text-red-500">{photoError}</p> : null}
        <div className="flex flex-col items-center gap-3">
          <div className="relative aspect-square w-full max-w-55 shrink-0 overflow-hidden rounded-2xl border border-border bg-background">
            {photoUrl ? (
              <Image src={photoUrl} alt="Foto de perfil" fill sizes="220px" className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-5xl text-muted">
                {user.firstName?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <PhotoCaptureInput onCapture={handlePhotoSelected} disabled={uploadingPhoto} />
          {uploadingPhoto ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-green/40 border-t-brand-green" /> : null}
        </div>
      </div>

      {/* Base location */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">A sua base</h2>
          <p className="text-sm text-muted">Ponto de partida usado para calcular a distância até cada loja.</p>
        </div>
        <LocationPicker latitude={position[0]} longitude={position[1]} onChange={(lat, lng) => setPosition([lat, lng])} />
      </div>

      {/* Transport */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Meio de transporte</h2>
        <div className="flex flex-wrap gap-2">
          {TRANSPORT_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTransportType(t)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                transportType === t ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-border bg-background text-foreground"
              }`}
            >
              {TRANSPORT_LABELS[t]}
            </button>
          ))}
        </div>
        {plateRequired ? (
          <div className="flex flex-col gap-2">
            <Input label="Matrícula do veículo" placeholder="AAB-123-MP" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
          </div>
        ) : null}
      </div>

      {/* Documents */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documentos</h2>
        </div>

        {docError ? <p className="text-sm text-red-500">{docError}</p> : null}

        {documents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {DOCUMENT_TYPE_LABELS[doc.type]} · {doc.number}
                  </p>
                  <p className="text-xs text-muted">
                    Emitido {doc.issueDate} em {doc.issuePlace} · Válido até {doc.expiryDate}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyDocId === doc.id}
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="shrink-0 rounded-lg border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-500 disabled:opacity-60"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Select label="Tipo de documento" value={docType} onChange={(e) => setDocType(e.target.value as CourierDocumentType)}>
            {DOCUMENT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Input label="Número do documento" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data de emissão" type="date" value={docIssueDate} onChange={(e) => setDocIssueDate(e.target.value)} />
            <Input label="Data de validade" type="date" value={docExpiryDate} onChange={(e) => setDocExpiryDate(e.target.value)} />
          </div>
          <Input label="Local de emissão" value={docIssuePlace} onChange={(e) => setDocIssuePlace(e.target.value)} />

          <button
            type="button"
            onClick={() => docFileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background p-6 text-center transition-colors hover:border-brand-green hover:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <span className="text-sm font-medium text-foreground">{docFile ? docFile.name : "Carregar documento"}</span>
            <span className="text-xs text-muted">Imagem ou PDF</span>
          </button>
          <input
            ref={docFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>
      </div>

      {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
      {saved ? (
        <p className="text-sm text-brand-green">
          {pendingApproval
            ? "Perfil guardado com sucesso. Assim que a administração aprovar o seu pedido, poderá associar-se a lojas."
            : "Perfil guardado com sucesso."}
        </p>
      ) : null}

      <Button type="button" loading={saving} className="w-auto px-6" onClick={() => void handleSubmit()}>
        {pendingApproval ? "Guardar perfil" : "Guardar e escolher lojas"}
      </Button>
    </div>
  );
}
