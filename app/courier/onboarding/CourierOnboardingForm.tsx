"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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

export function CourierOnboardingForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const [position, setPosition] = useState<[number, number]>(MAPUTO_DEFAULT);
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  useDeviceLocationDefault(hasSavedLocation, (lat, lng) => setPosition([lat, lng]));

  const [transportType, setTransportType] = useState<TransportType>("WALK");
  const [plateNumber, setPlateNumber] = useState("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(user.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<CourierDocument[]>([]);
  const [docType, setDocType] = useState<CourierDocumentType>("BI");
  const [docNumber, setDocNumber] = useState("");
  const [docIssueDate, setDocIssueDate] = useState("");
  const [docExpiryDate, setDocExpiryDate] = useState("");
  const [docIssuePlace, setDocIssuePlace] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [addingDoc, setAddingDoc] = useState(false);
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

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
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

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);
    if (!docFile) {
      setDocError("Selecione o ficheiro do documento.");
      return;
    }
    if (!docNumber.trim() || !docIssueDate || !docExpiryDate || !docIssuePlace.trim()) {
      setDocError("Preencha todos os campos do documento.");
      return;
    }
    setAddingDoc(true);
    try {
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
    } catch (err) {
      setDocError(err instanceof ClientApiError ? (err.details?.join(" ") ?? err.message) : "Não foi possível carregar o documento.");
    } finally {
      setAddingDoc(false);
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
  const hasLicence = documents.some((d) => d.type === "CARTA_CONDUCAO");

  const handleSubmit = async () => {
    setSaveError(null);
    setSaved(false);
    if (plateRequired && !plateNumber.trim()) {
      setSaveError("Indique a matrícula do veículo.");
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
      setSaved(true);
      router.push("/courier/stores");
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
          Estes dados são necessários antes de se poder associar a lojas e receber encomendas.
        </p>
      </div>

      {serviceUnavailable ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          Não foi possível carregar um perfil existente — pode continuar a preencher, mas guardar pode falhar até o
          serviço estar disponível.
        </p>
      ) : null}

      {/* Photo */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Foto de perfil</h2>
        {photoError ? <p className="text-sm text-red-500">{photoError}</p> : null}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-background">
            {photoUrl ? (
              <Image src={photoUrl} alt="Foto de perfil" fill sizes="80px" className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl text-muted">
                {user.firstName?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <Button type="button" variant="secondary" className="w-auto px-4" loading={uploadingPhoto} onClick={() => photoInputRef.current?.click()}>
            Alterar foto
          </Button>
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelected} />
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
            {!hasLicence ? (
              <p className="text-xs text-amber-600">
                Também precisa de carregar a Carta de Condução na secção de documentos abaixo.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Documents */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documentos</h2>
          <p className="text-sm text-muted">BI, Carta de Condução ou Passaporte — pode carregar mais do que um.</p>
        </div>

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
        ) : (
          <p className="text-sm text-muted">Ainda não carregou nenhum documento.</p>
        )}

        <form onSubmit={handleAddDocument} className="flex flex-col gap-3 border-t border-border pt-4">
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
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Ficheiro do documento</span>
            <input
              ref={docFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              className="text-sm text-muted"
            />
          </label>

          {docError ? <p className="text-sm text-red-500">{docError}</p> : null}

          <Button type="submit" variant="secondary" loading={addingDoc} className="w-auto px-6">
            Adicionar documento
          </Button>
        </form>
      </div>

      {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
      {saved ? <p className="text-sm text-brand-green">Perfil guardado com sucesso.</p> : null}

      <Button type="button" loading={saving} className="w-auto px-6" onClick={() => void handleSubmit()}>
        Guardar e escolher lojas
      </Button>
    </div>
  );
}
