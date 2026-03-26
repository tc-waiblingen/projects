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
  const addressParts: string[] = []
  if (sponsor.address_line1) addressParts.push(sponsor.address_line1)
  if (sponsor.address_line2) addressParts.push(sponsor.address_line2)
  const cityParts: string[] = []
  if (sponsor.address_zip_code) cityParts.push(sponsor.address_zip_code)
  if (sponsor.address_city) cityParts.push(sponsor.address_city)
  if (cityParts.length > 0) addressParts.push(cityParts.join(" "))
  const addressString = addressParts.join(", ")

  // Collect contact items for the footer
  const contactItems: React.ReactNode[] = []
  if (addressString) {
    contactItems.push(<span key="address">{addressString}</span>)
  }
  const contactFields = [
    { type: "phone" as const, value: sponsor.phone },
    { type: "email" as const, value: sponsor.email },
    { type: "website" as const, value: sponsor.website },
    { type: "instagram" as const, value: sponsor.instagram },
    { type: "facebook" as const, value: sponsor.facebook },
  ]
  for (const { type, value } of contactFields) {
    if (value) {
      contactItems.push(
        <ContactInfo
          key={type}
          type={type}
          value={value}
          name={sponsor.name}
          className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
        />,
      )
    }
  }

  const logoImage = hasLogo ? (
    <Image
      src={`/api/images/${logo.id}`}
      alt={sponsor.name}
      width={logo.width ?? 180}
      height={logo.height ?? 72}
      className="h-[72px] w-auto max-w-[180px] rounded object-contain"
      unoptimized
    />
  ) : null

  return (
    <div className="rounded-xl bg-white p-5 dark:bg-tcw-accent-800">
      {logoImage && (
        <div className="mb-4 flex justify-center">
          {sponsor.website ? (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="cursor-pointer"
            >
              {logoImage}
            </a>
          ) : (
            logoImage
          )}
        </div>
      )}
      <p className="text-center font-serif text-lg text-body">{sponsor.name}</p>
      {sponsor.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {sponsor.description}
        </p>
      )}
      {contactItems.length > 0 && (
        <div className="mt-3.5 flex flex-col gap-1 text-xs text-muted">
          {contactItems.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
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
