"use client"

import { useState } from "react"
import { clsx } from "clsx/lite"
import Image from "next/image"
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react"
import type { DirectusFile, Sponsor } from "@/types/directus-schema"
import { ContactInfo } from "@/components/elements/contact-info"

interface SponsorDialogProps {
  isOpen: boolean
  onClose: () => void
  sponsors: Sponsor | Sponsor[]
  title?: string
}

interface SponsorDialogTriggerProps {
  sponsor: Sponsor
  children: React.ReactNode
}

export function SponsorDetailCard({ sponsor }: { sponsor: Sponsor }) {
  const logo = sponsor.logo_web as DirectusFile | null
  const hasLogo = logo && typeof logo !== "string"

  // Build address string
  const addressParts = [
    sponsor.address_line1,
    sponsor.address_line2,
    [sponsor.address_zip_code, sponsor.address_city].filter(Boolean).join(" "),
  ].filter(Boolean)
  const hasAddress = addressParts.length > 0

  return (
    <div className="rounded-lg bg-white p-3 dark:bg-tcw-accent-800">
      {hasLogo && (
        <div className="mb-1.5">
          <Image
            src={`/api/images/${logo.id}`}
            alt={sponsor.name}
            width={logo.width ?? 200}
            height={logo.height ?? 100}
            className="h-auto max-h-24 w-full object-contain"
            unoptimized
          />
        </div>
      )}
      <p className="font-semibold text-tcw-accent-900 dark:text-white">
        {sponsor.name}
      </p>
      {sponsor.description && (
        <p className="mt-0.5 text-sm text-muted">
          {sponsor.description}
        </p>
      )}

      {/* Contact details */}
      {(hasAddress ||
        sponsor.phone ||
        sponsor.email ||
        sponsor.website ||
        sponsor.instagram) && (
        <div
          className={clsx(
            "space-y-1.5 text-sm text-muted",
            sponsor.description && "mt-3"
          )}
        >
          {hasAddress && (
            <p className="whitespace-pre-line">{addressParts.join("\n")}</p>
          )}
          {sponsor.phone && (
            <p>
              <ContactInfo
                type="phone"
                value={sponsor.phone}
                name={sponsor.name}
                className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
              />
            </p>
          )}
          {sponsor.email && (
            <p>
              <ContactInfo
                type="email"
                value={sponsor.email}
                name={sponsor.name}
                className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
              />
            </p>
          )}
          {sponsor.website && (
            <p>
              <ContactInfo
                type="website"
                value={sponsor.website}
                name={sponsor.name}
                className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
              />
            </p>
          )}
          {sponsor.instagram && (
            <p>
              <ContactInfo
                type="instagram"
                value={sponsor.instagram}
                name={sponsor.name}
                className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
              />
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function SponsorDialog({
  isOpen,
  onClose,
  sponsors,
  title,
}: SponsorDialogProps) {
  const sponsorArray = Array.isArray(sponsors) ? sponsors : [sponsors]

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-200 ease-out data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl transition-all duration-200 ease-out data-[closed]:translate-y-full data-[closed]:opacity-0 sm:rounded-2xl sm:data-[closed]:translate-y-4 dark:bg-tcw-accent-900"
        >
          <DialogTitle
            className={clsx(
              "mb-4 flex items-center",
              title ? "justify-between" : "justify-end"
            )}
          >
            {title && (
              <span className="text-sm font-semibold uppercase tracking-wider text-tcw-accent-500 dark:text-tcw-accent-400">
                {title}
              </span>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-1 text-tcw-accent-500 hover:bg-tcw-accent-100 dark:text-tcw-accent-400 dark:hover:bg-tcw-accent-800"
              aria-label="Schließen"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </DialogTitle>

          <div className="flex flex-col gap-4">
            {sponsorArray.map((sponsor) => (
              <SponsorDetailCard key={sponsor.id} sponsor={sponsor} />
            ))}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export function SponsorDialogTrigger({
  sponsor,
  children,
}: SponsorDialogTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer"
        aria-label={sponsor.name}
      >
        {children}
      </button>
      <SponsorDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sponsors={sponsor}
      />
    </>
  )
}
