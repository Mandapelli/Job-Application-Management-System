import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { UploadForm } from '../components/UploadForm';
import { useAttachDocument, useUploadDocument } from '../hooks';

export function NewDocumentPage() {
  const navigate = useNavigate();
  const upload = useUploadDocument();
  const attach = useAttachDocument();
  // "Upload new" on an application's page links here with ?applicationId=… so the file is attached after uploading.
  const applicationId = useSearchParams()[0].get('applicationId');
  const back = applicationId ? `/applications/${applicationId}` : '/documents';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to={back} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Upload document</h1>
        {applicationId && <p className="text-sm text-muted-foreground">It will be attached to the application afterwards.</p>}
      </div>
      <UploadForm
        onCancel={() => navigate(back)}
        onSubmit={async (input) => {
          const doc = await upload.mutateAsync(input);
          if (applicationId) {
            try {
              await attach.mutateAsync({ id: doc.id, applicationId });
            } catch {
              toast.warning('Uploaded, but it could not be attached. You can attach it from the application page.');
              navigate(back);
              return;
            }
          }
          toast.success(applicationId ? 'Document uploaded and attached' : 'Document uploaded');
          navigate(back);
        }}
      />
    </div>
  );
}
