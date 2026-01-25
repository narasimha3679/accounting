import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from './ui/Card';
import Button from './ui/Button';

interface AccessDeniedProps {
    message?: string;
    requiredPermission?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ 
    message = "You don't have permission to access this page.",
    requiredPermission 
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <Card className="p-8 max-w-md w-full text-center">
                <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-4">{message}</p>
                {requiredPermission && (
                    <p className="text-sm text-muted-foreground mb-6">
                        Required permission: <span className="font-mono text-foreground">{requiredPermission}</span>
                    </p>
                )}
                <Button
                    onClick={() => navigate('/')}
                    icon={ArrowLeft}
                    variant="outline"
                >
                    Go to Dashboard
                </Button>
            </Card>
        </div>
    );
};

export default AccessDenied;
