import { redirect } from 'next/navigation'

// Uploads now happen through the Upload CV dialog on the Candidates page
export default function UploadPage() {
  redirect('/candidates')
}
