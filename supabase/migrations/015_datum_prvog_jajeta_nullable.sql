-- datum_prvog_jajeta se unosi naknadno (kad se jaje pojavi), ne pri spajanju para
ALTER TABLE ciklusi ALTER COLUMN datum_prvog_jajeta DROP NOT NULL;
