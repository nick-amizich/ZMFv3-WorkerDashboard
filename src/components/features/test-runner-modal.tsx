'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestRunnerModalProps {
  onRunTests: (options: TestRunOptions) => void;
  isRunning: boolean;
}

interface TestRunOptions {
  coverage: boolean;
  watch: boolean;
  pattern?: string;
  updateSnapshots: boolean;
  bail: boolean;
}

export function TestRunnerModal({ onRunTests, isRunning }: TestRunnerModalProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TestRunOptions>({
    coverage: true,
    watch: false,
    updateSnapshots: false,
    bail: false,
  });
  const { toast } = useToast();

  const handleRun = () => {
    onRunTests(options);
    setOpen(false);
    toast({
      title: 'Test run started',
      description: 'Tests are running in the background. Check the results tab for updates.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Tests
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Test Run</DialogTitle>
          <DialogDescription>
            Choose how you want to run your tests
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="coverage">
              <div>Coverage Report</div>
              <div className="text-sm text-muted-foreground">Generate code coverage statistics</div>
            </Label>
            <Switch
              id="coverage"
              checked={options.coverage}
              onCheckedChange={(checked) => setOptions({ ...options, coverage: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="watch">
              <div>Watch Mode</div>
              <div className="text-sm text-muted-foreground">Re-run tests when files change</div>
            </Label>
            <Switch
              id="watch"
              checked={options.watch}
              onCheckedChange={(checked) => setOptions({ ...options, watch: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="updateSnapshots">
              <div>Update Snapshots</div>
              <div className="text-sm text-muted-foreground">Update component snapshots</div>
            </Label>
            <Switch
              id="updateSnapshots"
              checked={options.updateSnapshots}
              onCheckedChange={(checked) => setOptions({ ...options, updateSnapshots: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="bail">
              <div>Bail on First Failure</div>
              <div className="text-sm text-muted-foreground">Stop running tests after first failure</div>
            </Label>
            <Switch
              id="bail"
              checked={options.bail}
              onCheckedChange={(checked) => setOptions({ ...options, bail: checked })}
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Quick Options</Label>
            <div className="mt-2 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOptions({ coverage: true, watch: false, updateSnapshots: false, bail: false });
                  handleRun();
                }}
              >
                Run All Tests with Coverage
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOptions({ coverage: false, watch: false, updateSnapshots: false, bail: true });
                  handleRun();
                }}
              >
                Quick Test Run (Fail Fast)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setOptions({ coverage: false, watch: true, updateSnapshots: false, bail: false });
                  handleRun();
                }}
              >
                Watch Mode (Development)
              </Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}