
export interface ExtensionSeoMetadata {
    title?: string;
    meta_description?: string;
    og_image?: string;
    additional_fields?: Record<string, unknown>;
    sitemap?: {
        change_frequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
        priority: string;
    };
    no_index?: boolean;
    no_follow?: boolean;
}

export interface BlockAttachment {
	/** @primaryKey */
	id: number;
	sort?: number | null;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
	files?: BlockAttachmentsFile[] | string[];
}

export interface BlockAttachmentsFile {
	/** @primaryKey */
	id: number;
	block_attachments_id?: BlockAttachment | string | null;
	directus_files_id?: DirectusFile | string | null;
}

export interface BlockButton {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
	type?: 'page' | 'post' | 'url' | 'file' | null;
	/** @description The internal page to link to. */
	page?: Page | string | null;
	/** @description The internal post to link to. */
	post?: Post | string | null;
	/** @description Text to include on the button. */
	label?: string | null;
	/** @description What type of button */
	variant?: 'default' | 'outline' | 'soft' | 'ghost' | 'link' | null;
	/** @description The id of the Button Group this button belongs to. */
	button_group?: BlockButtonGroup | string | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
	url?: string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	file?: DirectusFile | string | null;
}

export interface BlockButtonGroup {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
	/** @description Add individual buttons to the button group. */
	buttons?: BlockButton[] | string[];
}

export interface BlockClubCalendar {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
}

export interface BlockForm {
	/** @primaryKey */
	id: string;
	/** @description Form to show within block */
	form?: Form | string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface BlockGallery {
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	/** @description Images to include in the image gallery. */
	items?: BlockGalleryItem[] | string[];
}

export interface BlockGalleryItem {
	/** @primaryKey */
	id: string;
	/** @description The id of the gallery block this item belongs to. */
	block_gallery?: BlockGallery | string | null;
	/** @description The id of the file included in the gallery. */
	directus_file?: DirectusFile | string | null;
	sort?: number | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface BlockHero {
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Featured image in the hero. */
	image?: DirectusFile | string | null;
	/** @description Action buttons that show below headline and description. */
	button_group?: BlockButtonGroup | string | null;
	/** @description Supporting copy that shows below the headline. */
	description?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description The layout for the component. You can set the image to display left, right, or in the center of page.. */
	layout?: 'image_left' | 'image_center' | 'image_right' | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. */
	tagline_button_type?: 'page' | 'post' | 'url' | 'file' | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
	tagline_button_url?: string | null;
	/** @description Text to include on the button. */
	tagline_button_label?: string | null;
	/** @description The internal page to link to. */
	tagline_button_page?: Page | string | null;
	tagline_button_post?: Post | string | null;
	tagline_button_file?: DirectusFile | string | null;
}

export interface BlockIframe {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	url?: string | null;
	height?: 'fixed' | `fit-content` | null;
	height_px?: number | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
}

export interface BlockInstagram {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	cta_label?: string | null;
	/** @description Max. Anzahl Beiträge, die gezeigt werden sollen */
	limit?: number | null;
	show_captions?: boolean;
	show_posts?: boolean;
	show_stories?: boolean;
	style?: 'large' | 'compact' | null;
}

export interface BlockMatchResult {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
}

export interface BlockNavMenu {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	nav?: Navigation | string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
}

export interface BlockPost {
	/** @primaryKey */
	id: string;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description The collection of content to fetch and display on the page within this block. @required */
	collection: 'posts';
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	limit?: number | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	style?: 'recent_cards' | 'archive' | null;
}

export interface BlockPricing {
	/** @primaryKey */
	id: string;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	/** @description The individual pricing cards to display. */
	pricing_cards?: BlockPricingCard[] | string[];
}

export interface BlockPricingCard {
	/** @primaryKey */
	id: string;
	/** @description Name of the pricing plan. Shown at the top of the card. */
	title?: string | null;
	/** @description Short, one sentence description of the pricing plan and who it is for. */
	description?: string | null;
	/** @description Price and term for the pricing plan. (ie `$199/mo`) */
	price?: string | null;
	/** @description Badge that displays at the top of the pricing plan card to add helpful context. */
	badge?: string | null;
	/** @description Short list of features included in this plan. Press `Enter` to add another item to the list. */
	features?: 'json' | null;
	/** @description The action button / link shown at the bottom of the pricing card. */
	button?: BlockButton | string | null;
	/** @description The id of the pricing block this card belongs to. */
	pricing?: BlockPricing | string | null;
	/** @description Add highlighted border around the pricing plan to make it stand out. */
	is_highlighted?: boolean | null;
	sort?: number | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface BlockRichtext {
	/** @description Rich text content for this block. */
	content?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface BlockSponsor {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	category?: 'premium_partner' | 'trade_partner' | null;
	/** @description Am besten eine SVG-Datei mit benannten Elementen (P1, P2, Label-P1, ...) */
	area_map?: DirectusFile | string | null;
	style?: 'cards' | 'site_plan' | 'table' | null;
}

export interface BlockTeam {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
}

export interface BlockTrainer {
	/** @primaryKey */
	id: number;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
}

export interface Calendar {
	/** @primaryKey */
	id: number;
	status?: 'published' | 'draft' | 'archived';
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	title?: string | null;
	description?: string | null;
	website?: string | null;
	logo?: DirectusFile | string | null;
	/** @required */
	start_date: string;
	end_date?: string | null;
	important?: boolean | null;
	show_on_tv?: boolean | null;
	/** @description Bleibt dieses Feld leer, findet der Termin beim TCW statt. */
	location?: string | null;
	category?: 'beginners' | 'children' | null;
}

export interface Court {
	/** @primaryKey */
	id: number;
	status?: 'published' | 'draft' | 'archived';
	sort?: number | null;
	user_updated?: string | null;
	date_updated?: string | null;
	type?: 'tennis_outdoor' | 'tennis_indoor';
	location?: string | null;
	location_polygon?: string | null;
	name?: string | null;
	sponsors?: CourtsSponsor[] | string[];
}

export interface CourtsSponsor {
	/** @primaryKey */
	id: number;
	courts_id?: Court | string | null;
	sponsors_id?: Sponsor | string | null;
}

export interface FormField {
	/** @primaryKey */
	id: string;
	/** @description Unique field identifier, not shown to users (lowercase, hyphenated) */
	name?: string | null;
	/** @description Input type for the field */
	type?: 'text' | 'textarea' | 'checkbox' | 'checkbox_group' | 'radio' | 'file' | 'select' | 'hidden' | null;
	/** @description Text label shown to form users. */
	label?: string | null;
	/** @description Default text shown in empty input. */
	placeholder?: string | null;
	/** @description Additional instructions shown below the input */
	help?: string | null;
	/** @description Available rules: `email`, `url`, `min:5`, `max:20`, `length:10`. Combine with pipes example: `email|max:255` */
	validation?: string | null;
	/** @description Field width on the form */
	width?: '100' | '67' | '50' | '33' | null;
	/** @description Options for radio or select inputs */
	choices?: Array<{ text: string; value: string }> | null;
	/** @description Parent form this field belongs to. */
	form?: Form | string | null;
	sort?: number | null;
	/** @description Make this field mandatory to complete. */
	required?: boolean | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface FormSubmissionValue {
	/** @primaryKey */
	id: string;
	/** @description Parent form submission for this value. */
	form_submission?: FormSubmission | string | null;
	field?: FormField | string | null;
	/** @description The data entered by the user for this specific field in the form submission. */
	value?: string | null;
	sort?: number | null;
	file?: DirectusFile | string | null;
	/** @description Form submission date and time. */
	timestamp?: string | null;
}

export interface FormSubmission {
	/** @description Unique ID for this specific form submission @primaryKey */
	id: string;
	/** @description Form submission date and time. */
	timestamp?: string | null;
	/** @description Associated form for this submission. */
	form?: Form | string | null;
	/** @description Submitted field responses */
	values?: FormSubmissionValue[] | string[];
}

export interface Form {
	/** @primaryKey */
	id: string;
	/** @description Action after successful submission. */
	on_success?: 'redirect' | 'message' | null;
	sort?: number | null;
	/** @description Text shown on submit button. */
	submit_label?: string | null;
	/** @description Message shown after successful submission. */
	success_message?: string | null;
	/** @description Form name (for internal reference). */
	title?: string | null;
	/** @description Destination URL after successful submission. */
	success_redirect_url?: string | null;
	/** @description Show or hide this form from the site. */
	is_active?: boolean | null;
	/** @description Setup email notifications when forms are submitted. */
	emails?: Array<{ to: string[]; subject: string; message: string }> | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	/** @description Form structure and input fields */
	fields?: FormField[] | string[];
	/** @description Received form responses. */
	submissions?: FormSubmission[] | string[];
}

export interface Global {
	/** @primaryKey */
	id: number;
	title?: string | null;
	description?: string | null;
	address_street?: string | null;
	/** @description Postleitzahl */
	address_zip_code?: string | null;
	/** @description Stadt */
	address_city?: string | null;
	/** @description Im internationalen Format ohne Leerzeichen, Trennzeichen, etc. */
	phone?: string | null;
	email?: string | null;
	website?: string | null;
	/** @description Vollständige URL zum Instagram-Profil */
	instagram?: string | null;
	/** @description Kalender im iCal-Format */
	app_calendar_url?: string | null;
	club_name?: string | null;
	address_maps_url?: string | null;
	/** @description Kalender im iCal-Format */
	nuliga_matches_url?: string | null;
	/** @description Kalender im iCal-Format */
	wtb_tournaments_url?: string | null;
	tagline?: string | null;
}

export interface Navigation {
	/** @description Unique identifier for this menu. Can't be edited after creation. @primaryKey */
	id: string;
	/** @description What is the name of this menu? Only used internally. */
	title?: string | null;
	/** @description Show or hide this menu from the site. */
	is_active?: boolean | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	/** @description Links within the menu. */
	items?: NavigationItem[] | string[];
}

export interface NavigationItem {
	/** @primaryKey */
	id: string;
	/** @description Navigation menu that the individual links belong to. */
	navigation?: Navigation | string | null;
	/** @description The internal page to link to. */
	page?: Page | string | null;
	/** @description The parent navigation item. */
	parent?: NavigationItem | string | null;
	sort?: number | null;
	/** @description Label shown to the user for the menu item. @required */
	title: string;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
	type?: 'page' | 'post' | 'file' | 'url' | 'group' | 'divider' | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
	url?: string | null;
	/** @description The internal post to link to. */
	post?: Post | string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	is_primary?: boolean | null;
	file?: DirectusFile | string | null;
	/** @description Auf kleinen Bildschirmen den Menüeintrag immer zeigen */
	primary_on_mobile?: boolean | null;
	/** @description Add child menu items within the group. */
	children?: NavigationItem[] | string[];
}

export interface OfficeAnnouncement {
	/** @primaryKey */
	id: number;
	/** @description Die Nachricht wird nur angezeigt, wenn der Status auf "Veröffentlicht" steht. */
	status?: 'published' | 'draft' | 'archived';
	user_updated?: string | null;
	date_updated?: string | null;
	message?: string | null;
	/** @description Nachricht ab diesem Tag anzeigen */
	from?: string | null;
	/** @description Nachricht bis zu diesem Tag anzeigen */
	until?: string | null;
}

export interface OfficeClosingDay {
	/** @primaryKey */
	id: number;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @required */
	date: string;
	comment?: string | null;
}

export interface OfficeHour {
	/** @primaryKey */
	id: number;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @required */
	day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
	/** @required */
	starts_at: string;
	/** @required */
	ends_at: string;
	sort?: number | null;
}

export interface PageBlock {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description The id of the page that this block belongs to. */
	page?: Page | string | null;
	/** @description The data for the block. */
	item?: BlockHero | BlockRichtext | BlockForm | BlockPost | BlockGallery | BlockPricing | BlockAttachment | BlockTeam | BlockClubCalendar | BlockMatchResult | BlockSponsor | BlockInstagram | BlockIframe | BlockTrainer | BlockButtonGroup | BlockNavMenu | string | null;
	/** @description The collection (type of block). */
	collection?: string | null;
	/** @description Temporarily hide this block on the website without having to remove it from your page. */
	hide_block?: boolean | null;
	/** @description Background color for the block to create contrast. Does not control dark or light mode for the entire site. */
	background?: 'default' | 'light' | 'dark' | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface Page {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description The title of this page. @required */
	title: string;
	/** @description Unique URL for this page (start with `/`, can have multiple segments `/about/me`)). @required */
	permalink: string;
	/** @description Is this page published? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Publish now or schedule for later. */
	published_at?: string | null;
	seo?: ExtensionSeoMetadata | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	show_title?: boolean | null;
	show_toc?: boolean | null;
	/** @description Create and arrange different content blocks (like text, images, or videos) to build your page. */
	blocks?: PageBlock[] | string[];
}

export interface Post {
	content?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Featured image for this post. Used in cards linking to the post and in the post detail page. */
	image?: DirectusFile | string | null;
	/** @description Eindeutige URL für diesen Beitrag (z.B. `tc-waiblingen.de/news/{{year}}/{{slug}}`) */
	slug?: string | null;
	sort?: number | null;
	/** @description Is this post published? */
	status?: 'draft' | 'in_review' | 'published' | 'archived';
	/** @description Titel des News-Eintrags @required */
	title: string;
	/** @description Eine kleine Zusammenfassung des Inhalts (als Vorschau) */
	description?: string | null;
	/** @description Select the team member who wrote this post */
	author?: string | null;
	/** @description Jetzt oder später veröffentlichen */
	published_at?: string | null;
	seo?: ExtensionSeoMetadata | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
	imported_from_wordpress?: boolean | null;
	show_toc?: boolean | null;
}

export interface Redirect {
	/** @primaryKey */
	id: string;
	response_code?: '301' | '302' | null;
	/** @description Old URL has to be relative to the site (ie `/blog` or `/news`). It cannot be a full url like (https://example.com/blog) */
	url_from?: string | null;
	/** @description The URL you're redirecting to. This can be a relative url (/resources/matt-is-cool) or a full url (https://example.com/blog). */
	url_to?: string | null;
	/** @description Short explanation of why the redirect was created. */
	note?: string | null;
	date_created?: string | null;
	user_created?: string | null;
	date_updated?: string | null;
	user_updated?: string | null;
}

export interface Sponsor {
	/** @primaryKey */
	id: number;
	/** @required */
	status: 'active' | 'draft' | 'inactive';
	sort?: number | null;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @required */
	name: string;
	/** @required */
	category: 'premium_partner' | 'trade_partner';
	description?: string | null;
	address_line1?: string | null;
	address_line2?: string | null;
	address_zip_code?: string | null;
	address_city?: string | null;
	website?: string | null;
	/** @description Im internationalen Format ohne Leerzeichen, Trennzeichen, etc. */
	phone?: string | null;
	active_from?: string | null;
	active_until?: string | null;
	email?: string | null;
	/** @description Vollständige URL zum Instagram-Profil */
	instagram?: string | null;
	/** @description Komplette URL zur Facebook-Seite */
	facebook?: string | null;
	/** @description SVG (möglichst 780×348), etwas Rand */
	logo_web?: DirectusFile | string | null;
	/** @description JPEG in 780×348, weißer Hintergrund, etwas Rand */
	logo_app?: DirectusFile | string | null;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
	courts?: CourtsSponsor[] | string[];
}

export interface Team {
	/** @primaryKey */
	id: number;
	status?: 'published' | 'draft' | 'archived';
	sort?: number | null;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	name?: string | null;
	function?: string | null;
	picture?: DirectusFile | string | null;
}

export interface Trainer {
	/** @primaryKey */
	id: number;
	status?: 'published' | 'draft' | 'archived';
	sort?: number | null;
	user_created?: string | null;
	date_created?: string | null;
	user_updated?: string | null;
	date_updated?: string | null;
	/** @required */
	name: string;
	/** @description Im internationalen Format ohne Leerzeichen, Trennzeichen, etc. */
	phone?: string | null;
	email?: string | null;
	website?: string | null;
	banner?: DirectusFile | string | null;
}

export interface DirectusCollection {
	/** @primaryKey */
	collection: string;
	icon?: string | null;
	note?: string | null;
	display_template?: string | null;
	hidden?: boolean;
	singleton?: boolean;
	translations?: Array<{ language: string; translation: string; singular: string; plural: string }> | null;
	archive_field?: string | null;
	archive_app_filter?: boolean;
	archive_value?: string | null;
	unarchive_value?: string | null;
	sort_field?: string | null;
	accountability?: 'all' | 'activity' | null | null;
	color?: string | null;
	item_duplication_fields?: 'json' | null;
	sort?: number | null;
	group?: DirectusCollection | string | null;
	collapse?: string;
	preview_url?: string | null;
	versioning?: boolean;
}

export interface DirectusField {
	/** @primaryKey */
	id: number;
	collection?: DirectusCollection | string;
	field?: string;
	special?: string[] | null;
	interface?: string | null;
	options?: 'json' | null;
	display?: string | null;
	display_options?: 'json' | null;
	readonly?: boolean;
	hidden?: boolean;
	sort?: number | null;
	width?: string | null;
	translations?: 'json' | null;
	note?: string | null;
	conditions?: 'json' | null;
	required?: boolean | null;
	group?: DirectusField | string | null;
	validation?: 'json' | null;
	validation_message?: string | null;
	searchable?: boolean;
}

export interface DirectusFile {
	/** @primaryKey */
	id: string;
	storage?: string;
	filename_disk?: string | null;
	filename_download?: string;
	title?: string | null;
	type?: string | null;
	folder?: string | null;
	uploaded_by?: string | null;
	created_on?: string;
	modified_by?: string | null;
	modified_on?: string;
	charset?: string | null;
	filesize?: number | null;
	width?: number | null;
	height?: number | null;
	duration?: number | null;
	embed?: string | null;
	description?: string | null;
	location?: string | null;
	tags?: string[] | null;
	metadata?: 'json' | null;
	focal_point_x?: number | null;
	focal_point_y?: number | null;
	tus_id?: string | null;
	tus_data?: 'json' | null;
	uploaded_on?: string | null;
}

export interface DirectusRelation {
	/** @primaryKey */
	id: number;
	many_collection?: string;
	many_field?: string;
	one_collection?: string | null;
	one_field?: string | null;
	one_collection_field?: string | null;
	one_allowed_collections?: string[] | null;
	junction_field?: string | null;
	sort_field?: string | null;
	one_deselect_action?: string;
}

export interface Schema {
	block_attachments: BlockAttachment[];
	block_attachments_files: BlockAttachmentsFile[];
	block_button: BlockButton[];
	block_button_group: BlockButtonGroup[];
	block_club_calendar: BlockClubCalendar[];
	block_form: BlockForm[];
	block_gallery: BlockGallery[];
	block_gallery_items: BlockGalleryItem[];
	block_hero: BlockHero[];
	block_iframe: BlockIframe[];
	block_instagram: BlockInstagram[];
	block_match_results: BlockMatchResult[];
	block_nav_menu: BlockNavMenu[];
	block_posts: BlockPost[];
	block_pricing: BlockPricing[];
	block_pricing_cards: BlockPricingCard[];
	block_richtext: BlockRichtext[];
	block_sponsors: BlockSponsor[];
	block_team: BlockTeam[];
	block_trainers: BlockTrainer[];
	calendar: Calendar[];
	courts: Court[];
	courts_sponsors: CourtsSponsor[];
	form_fields: FormField[];
	form_submission_values: FormSubmissionValue[];
	form_submissions: FormSubmission[];
	forms: Form[];
	global: Global;
	navigation: Navigation[];
	navigation_items: NavigationItem[];
	office_announcement: OfficeAnnouncement;
	office_closing_days: OfficeClosingDay[];
	office_hours: OfficeHour[];
	page_blocks: PageBlock[];
	pages: Page[];
	posts: Post[];
	redirects: Redirect[];
	sponsors: Sponsor[];
	team: Team[];
	trainers: Trainer[];
	directus_collections: DirectusCollection[];
	directus_fields: DirectusField[];
	directus_files: DirectusFile[];
	directus_relations: DirectusRelation[];
}

export enum CollectionNames {
	block_attachments = 'block_attachments',
	block_attachments_files = 'block_attachments_files',
	block_button = 'block_button',
	block_button_group = 'block_button_group',
	block_club_calendar = 'block_club_calendar',
	block_form = 'block_form',
	block_gallery = 'block_gallery',
	block_gallery_items = 'block_gallery_items',
	block_hero = 'block_hero',
	block_iframe = 'block_iframe',
	block_instagram = 'block_instagram',
	block_match_results = 'block_match_results',
	block_nav_menu = 'block_nav_menu',
	block_posts = 'block_posts',
	block_pricing = 'block_pricing',
	block_pricing_cards = 'block_pricing_cards',
	block_richtext = 'block_richtext',
	block_sponsors = 'block_sponsors',
	block_team = 'block_team',
	block_trainers = 'block_trainers',
	calendar = 'calendar',
	courts = 'courts',
	courts_sponsors = 'courts_sponsors',
	form_fields = 'form_fields',
	form_submission_values = 'form_submission_values',
	form_submissions = 'form_submissions',
	forms = 'forms',
	global = 'global',
	navigation = 'navigation',
	navigation_items = 'navigation_items',
	office_announcement = 'office_announcement',
	office_closing_days = 'office_closing_days',
	office_hours = 'office_hours',
	page_blocks = 'page_blocks',
	pages = 'pages',
	posts = 'posts',
	redirects = 'redirects',
	sponsors = 'sponsors',
	team = 'team',
	trainers = 'trainers',
	directus_collections = 'directus_collections',
	directus_fields = 'directus_fields',
	directus_files = 'directus_files',
	directus_relations = 'directus_relations'
}