'use client'

import { ElTabGroup, ElTabList, ElTabPanels } from '@tailwindplus/elements/react'
import { clsx } from 'clsx/lite'
import { type ComponentProps, type ReactNode } from 'react'
import { Container } from '../elements/container'
import { CheckmarkIcon } from '../icons/checkmark-icon'
import { MinusIcon } from '../icons/minus-icon'

function FeatureGroup<Plan extends string>({
  group,
  plans,
}: {
  group: {
    title: ReactNode
    features: { name: ReactNode; value: ReactNode | Record<Plan, ReactNode> }[]
  }
  plans: Plan[]
}) {
  return (
    <tbody>
      <tr>
        <th
          colSpan={plans.length + 1}
          scope="colgroup"
          className="border-t border-b border-t-tcw-accent-900/5 border-b-tcw-accent-900/10 pt-14 pb-4 font-semibold text-tcw-accent-900 dark:border-t-white/5 dark:border-b-white/10 dark:text-white"
        >
          {group.title}
        </th>
      </tr>
      {group.features.map((feature) => (
        <tr key={String(feature.name)} className="group">
          <th
            scope="row"
            className="border-t border-tcw-accent-900/5 py-4 pr-3 font-normal text-tcw-accent-800 group-first:border-tcw-accent-900/10 dark:border-white/5 dark:text-tcw-accent-200 dark:group-first:border-white/10"
          >
            {feature.name}
          </th>
          {plans.map((plan) => {
            const value = ((value): value is Record<Plan, ReactNode> =>
              typeof value === 'object' && value !== null && plan in value)(feature.value)
              ? feature.value[plan]
              : feature.value

            return (
              <td
                key={plan}
                className="border-t border-tcw-accent-900/5 px-3 py-4 text-center text-tcw-accent-800 group-first:border-tcw-accent-900/10 dark:border-white/10 dark:text-tcw-accent-200 dark:group-first:border-white/10"
              >
                {value === true ? (
                  <CheckmarkIcon aria-label="Included" className="stroke-tcw-accent-900 dark:stroke-white" />
                ) : value === false ? (
                  <MinusIcon aria-label="Not included" className="stroke-tcw-accent-900 dark:stroke-white" />
                ) : (
                  value
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </tbody>
  )
}

export function PlanComparisonTable<const Plan extends string>({
  plans,
  features,
  className,
  ...props
}: {
  plans: Plan[]
  features: {
    title: ReactNode
    features: { name: ReactNode; value: ReactNode | Record<Plan, ReactNode> }[]
  }[]
} & ComponentProps<'section'>) {
  return (
    <section className={clsx('py-16', className)} {...props}>
      <Container>
        <table className="w-full border-collapse text-left text-sm/5 max-sm:hidden">
          <colgroup>
            <col className="w-2/5" />
            {plans.map((plan) => (
              <col key={plan} style={{ width: `calc(60% / ${plans.length})` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-(--scroll-padding-top) bg-tcw-accent-100 py-5 pr-3 text-base/7 font-medium text-tcw-accent-900 dark:bg-tcw-accent-900 dark:text-white">
                Compare features
              </th>
              {plans.map((plan, index) => (
                <th
                  key={index}
                  className="sticky top-(--scroll-padding-top) bg-tcw-accent-100 p-3 text-center font-semibold text-tcw-accent-900 dark:bg-tcw-accent-900 dark:text-white"
                >
                  {plan}
                </th>
              ))}
            </tr>
          </thead>
          {features.map((group, index) => (
            <FeatureGroup key={index} group={group} plans={plans} />
          ))}
        </table>

        <div className="sm:hidden">
          <ElTabGroup>
            <ElTabList className="flex gap-6">
              {plans.map((plan) => (
                <button
                  key={plan}
                  type="button"
                  className="relative -mb-px flex-1 border-b border-b-transparent px-2 py-6 text-sm/5 font-medium text-tcw-accent-500 aria-selected:border-tcw-accent-900 aria-selected:text-tcw-accent-900 dark:aria-selected:border-white dark:aria-selected:text-white"
                >
                  {plan}
                </button>
              ))}
            </ElTabList>
            <ElTabPanels>
              {plans.map((plan) => (
                <table key={plan} className="w-full border-collapse text-left text-sm/5">
                  <colgroup>
                    <col className="w-3/4" />
                    <col className="w-1/4" />
                  </colgroup>
                  {features.map((group, index) => (
                    <FeatureGroup key={index} group={group} plans={[plan]} />
                  ))}
                </table>
              ))}
            </ElTabPanels>
          </ElTabGroup>
        </div>
      </Container>
    </section>
  )
}
